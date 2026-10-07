// Google Apps Script: run once at https://script.google.com to create the two
// Subject Compass forms with private response sheets (see docs/ratings-setup.md).
// It logs the pre-filled links (needed for src/config.ts) and the sheet links (keep private).
function createSubjectCompassForms() {
  // ---------- Form 1: subject ratings ----------
  const ratings = FormApp.create('Subject Compass – Subject ratings');
  setup(ratings, 'Anonymous subject ratings for Subject Compass, an unofficial student tool.');
  const r = {
    code: ratings.addTextItem().setTitle('Subject code').setRequired(true),
    year: ratings.addTextItem().setTitle('Year taken').setRequired(true),
    semester: ratings.addListItem().setTitle('Semester taken')
      .setChoiceValues(['Summer', 'Semester 1', 'Winter', 'Semester 2']).setRequired(true),
    difficulty: ratings.addScaleItem().setTitle('Difficulty').setBounds(1, 5).setRequired(true),
    workload: ratings.addScaleItem().setTitle('Workload').setBounds(1, 5).setRequired(true),
    generosity: ratings.addScaleItem().setTitle('Marking generosity').setBounds(1, 5).setRequired(true),
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
  const ratingsSheet = SpreadsheetApp.create('Subject Compass – ratings (private)');
  ratings.setDestination(FormApp.DestinationType.SPREADSHEET, ratingsSheet.getId());
  const ratingsLink = ratings.createResponse()
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
    .withItemResponse(r.language.createResponse('en'))
    .toPrefilledUrl();

  // ---------- Form 2: feedback ----------
  const feedback = FormApp.create('Subject Compass – Feedback');
  setup(feedback, 'Feedback for Subject Compass, an unofficial student tool.');
  const f = {
    topic: feedback.addTextItem().setTitle('Topic').setRequired(true),
    rating: feedback.addTextItem().setTitle('Rating'),
    subject: feedback.addTextItem().setTitle('Subject code'),
    message: feedback.addParagraphTextItem().setTitle('Message').setRequired(true),
    contact: feedback.addTextItem().setTitle('Contact'),
    language: feedback.addTextItem().setTitle('App language'),
  };
  const feedbackSheet = SpreadsheetApp.create('Subject Compass – feedback (private)');
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
  form.setAcceptingResponses(true);
  try { form.setPublished(true); } catch (e) { /* older API: publish manually */ }
}
