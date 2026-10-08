// Google Apps Script: run once at https://script.google.com to create the two
// PickMySubjects forms with private response sheets (see docs/ratings-setup.md).
// It logs the pre-filled links (needed for src/config.ts) and the sheet links (keep private).
function createSubjectCompassForms() {
  // ---------- Form 1: subject ratings ----------
  const ratings = FormApp.create('PickMySubjects – Subject ratings');
  setup(ratings, 'Anonymous subject ratings for PickMySubjects, an unofficial student tool.');
  const r = {
    code: ratings.addTextItem().setTitle('Subject code').setRequired(true),
    // Everything but the code (filled in by the app) is optional: students skip what they don't know.
    year: ratings.addTextItem().setTitle('Year taken'),
    semester: ratings.addListItem().setTitle('Semester taken')
      .setChoiceValues(['Summer', 'Semester 1', 'Winter', 'Semester 2']),
    difficulty: ratings.addScaleItem().setTitle('Difficulty').setBounds(1, 5),
    workload: ratings.addScaleItem().setTitle('Workload').setBounds(1, 5),
    generosity: ratings.addScaleItem().setTitle('Marking generosity').setBounds(1, 5),
    hours: ratings.addTextItem().setTitle('Hours per week'),
    grade: ratings.addListItem().setTitle('Grade band')
      .setChoiceValues(['H1', 'H2A', 'H2B', 'H3', 'P', 'N', 'Prefer not to say']),
    skills: ratings.addCheckboxItem().setTitle('Skills used').setChoiceValues([
      'programming', 'algorithms', 'maths', 'statistics', 'data', 'systems',
      'writing', 'presentation', 'lab', 'design', 'business']),
    recommend: ratings.addMultipleChoiceItem().setTitle('Would you recommend it')
      .setChoiceValues(['Yes', 'Maybe', 'No']),
    wish: ratings.addParagraphTextItem().setTitle('What I wish I knew'),
    language: ratings.addTextItem().setTitle('App language'),
  };
  const extra = addOptionalRatingItems(ratings);
  const ratingsSheet = SpreadsheetApp.create('PickMySubjects – ratings (private)');
  ratings.setDestination(FormApp.DestinationType.SPREADSHEET, ratingsSheet.getId());
  const ratingsResponse = ratings.createResponse()
    .withItemResponse(r.code.createResponse('COMP30027'))
    .withItemResponse(r.year.createResponse('2025'))
    .withItemResponse(r.semester.createResponse('Semester 1'))
    .withItemResponse(r.difficulty.createResponse(3))
    .withItemResponse(r.workload.createResponse(3))
    .withItemResponse(r.generosity.createResponse(3))
    .withItemResponse(r.hours.createResponse('10'))
    .withItemResponse(r.grade.createResponse('H1'))
    .withItemResponse(r.skills.createResponse(['maths']))
    .withItemResponse(r.recommend.createResponse('Yes'))
    .withItemResponse(r.wish.createResponse('sample'))
    .withItemResponse(r.language.createResponse('en'));
  extra.forEach(function (item) { ratingsResponse.withItemResponse(item.createResponse(3)); });
  const ratingsLink = ratingsResponse.toPrefilledUrl();

  // ---------- Form 2: feedback ----------
  const feedback = FormApp.create('PickMySubjects – Feedback');
  setup(feedback, 'Feedback for PickMySubjects, an unofficial student tool.');
  const f = {
    topic: feedback.addTextItem().setTitle('Topic').setRequired(true),
    rating: feedback.addTextItem().setTitle('Rating'),
    subject: feedback.addTextItem().setTitle('Subject code'),
    message: feedback.addParagraphTextItem().setTitle('Message'), // a score alone is fine
    contact: feedback.addTextItem().setTitle('Contact'),
    language: feedback.addTextItem().setTitle('App language'),
  };
  const feedbackSheet = SpreadsheetApp.create('PickMySubjects – feedback (private)');
  feedback.setDestination(FormApp.DestinationType.SPREADSHEET, feedbackSheet.getId());
  const feedbackLink = feedback.createResponse()
    .withItemResponse(f.topic.createResponse('idea'))
    .withItemResponse(f.rating.createResponse('4'))
    .withItemResponse(f.subject.createResponse('COMP30027'))
    .withItemResponse(f.message.createResponse('sample'))
    .withItemResponse(f.contact.createResponse('sample'))
    .withItemResponse(f.language.createResponse('en'))
    .toPrefilledUrl();

  Logger.log('SEND TO CLAUDE – ratings pre-filled link:\n' + ratingsLink);
  Logger.log('SEND TO CLAUDE – feedback pre-filled link:\n' + feedbackLink);
  Logger.log('KEEP PRIVATE – ratings sheet: ' + ratingsSheet.getUrl());
  Logger.log('KEEP PRIVATE – feedback sheet: ' + feedbackSheet.getUrl());
  Logger.log('Edit ratings form: ' + ratings.getEditUrl());
  Logger.log('Edit feedback form: ' + feedback.getEditUrl());
}

// No emails collected, no sign-in, open for responses.
function setup(form, description) {
  form.setDescription(description);
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);
  form.setPublishingSummary(false); // respondents never see other people's answers
  form.setAcceptingResponses(true);
  try { form.setPublished(true); } catch (e) { /* older API: publish manually */ }
}

// ---------- Later addition: optional rating questions ----------
// Forms created before these questions existed: open the ratings form in Google
// Forms, copy its address from the browser (…/forms/d/<id>/edit), paste it below,
// then run addRatingQuestions once. Safe to run again; it won't add duplicates.
const RATINGS_FORM_EDIT_URL = 'PASTE THE RATINGS FORM EDIT LINK HERE';

function addRatingQuestions() {
  const form = FormApp.openByUrl(RATINGS_FORM_EDIT_URL);
  const items = addOptionalRatingItems(form);
  const response = form.createResponse();
  items.forEach(function (item) { response.withItemResponse(item.createResponse(3)); });
  Logger.log('SEND TO CLAUDE – pre-filled link with the new questions:\n' + response.toPrefilledUrl());
}

// Optional 1–5 questions. Titles must match scripts/ratings/aggregate.ts.
function addOptionalRatingItems(form) {
  return ['Exam difficulty', 'Usefulness', 'Interest', 'Teaching'].map(function (title) {
    const existing = form.getItems(FormApp.ItemType.SCALE).filter(function (i) { return i.getTitle() === title; })[0];
    return existing ? existing.asScaleItem() : form.addScaleItem().setTitle(title).setBounds(1, 5);
  });
}

// ---------- Later change: answers optional ----------
// Forms created before this had required questions, and Google drops a
// submission that leaves a required question blank. Paste the feedback
// form's edit link below too, then run makeAnswersOptional once.
const FEEDBACK_FORM_EDIT_URL = 'PASTE THE FEEDBACK FORM EDIT LINK HERE';

function makeAnswersOptional() {
  setOptional(FormApp.openByUrl(RATINGS_FORM_EDIT_URL), ['Year taken', 'Semester taken', 'Difficulty', 'Workload', 'Marking generosity']);
  setOptional(FormApp.openByUrl(FEEDBACK_FORM_EDIT_URL), ['Message']);
  Logger.log('Done: those questions are now optional.');
}

function setOptional(form, titles) {
  form.getItems().forEach(function (item) {
    if (titles.indexOf(item.getTitle()) < 0) return;
    const type = item.getType();
    if (type === FormApp.ItemType.TEXT) item.asTextItem().setRequired(false);
    if (type === FormApp.ItemType.PARAGRAPH_TEXT) item.asParagraphTextItem().setRequired(false);
    if (type === FormApp.ItemType.LIST) item.asListItem().setRequired(false);
    if (type === FormApp.ItemType.SCALE) item.asScaleItem().setRequired(false);
  });
}
