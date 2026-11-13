import type { LocaleCode } from './codes'

/**
 * What each feature page does, how to use it and the questions it answers, written into the
 * prerendered HTML of that page. Search engines and AI assistants mostly read that HTML without
 * running the app, so without it the planner and tools pages say almost nothing about themselves.
 * Every line must stay true to what the feature really does; update it when the feature changes.
 */
export type FeatureId = 'plan' | 'compare' | 'recommend' | 'record' | 'final' | 'wam' | 'revision'

export interface FeatureGuide {
  what: string[]
  steps: string[]
  /** Questions in the words students use, each one this page answers. */
  asks: string[]
}

export interface FeatureLocale {
  headings: { what: string; steps: string; asks: string }
  guides: Record<FeatureId, FeatureGuide>
}

export const FEATURE_PATHS: Record<FeatureId, string> = {
  plan: 'plan',
  compare: 'plan/compare',
  recommend: 'recommend',
  record: 'record',
  final: 'tools/final',
  wam: 'tools/wam',
  revision: 'tools/revision',
}

export const FEATURE_GUIDES: Record<LocaleCode, FeatureLocale> = {
  en: {
    headings: { what: 'What it does', steps: 'How to use it', asks: 'Questions it answers' },
    guides: {
      plan: {
        what: [
          'Builds your whole degree semester by semester for your degree and major, plus a second major, minor or specialisation where your degree allows it.',
          'Checks every subject’s prerequisites, your course rules (points, levels, breadth and discipline limits) and how heavy each semester is. Each check shows as met, not met or can’t tell yet.',
          'Explains heavy semesters and suggests swaps to spread them out, plans failed subjects again, and warns when the plan runs past the usual length, which matters on a student visa.',
          'Drag subjects between semesters, add summer or winter terms, see census dates, share the plan as a link, or print it and save it as PDF.',
        ],
        steps: [
          'Choose your degree, major and the semester you start.',
          'Add the subjects you’ve already finished on My record (skip this if you’re just starting).',
          'Open Plan: every semester is filled in and checked. Move or swap subjects until every check is met, then confirm in the Handbook and My Course Planner.',
        ],
        asks: [
          'How do I plan my subjects at UniMelb?',
          'Which subjects should I take each semester for my major?',
          'Can I fit a second major or a minor into my degree?',
          'Will I still finish on time after failing a subject?',
        ],
      },
      compare: {
        what: [
          'Keep up to five plans (Plan A, Plan B…), each with its own major, strengths, interests and goal.',
          'Put them side by side: degree rules met, last semester, heavy semesters, predicted WAM and every subject that differs.',
        ],
        steps: ['Make a second plan in the planner; each plan keeps its own major and goal.', 'Open Compare plans to see them side by side.'],
        asks: ['Should I do this major or that one?', 'Which of my plans finishes sooner or has lighter semesters?'],
      },
      recommend: {
        what: [
          'Ranks the subjects you can take from your own marks, strengths and interests, each with the reason.',
          'Pick a goal: protect my WAM, balanced, or stretch me.',
          'Lists only subjects whose prerequisites you meet and that run soon.',
        ],
        steps: ['Add your finished subjects and marks on My record.', 'Tap your strengths, interests and goal (all optional; the more you add, the better it gets).', 'Open Subjects that suit you (or turn on Sort for me in Find subjects) and read the reason under each subject.'],
        asks: ['Which UniMelb subjects should I take next semester?', 'Which electives or breadth subjects suit me?', 'Which subjects are good for my WAM?'],
      },
      record: {
        what: [
          'Your finished subjects and marks, with your WAM worked out; pass/fail subjects and fails are handled the way the University does.',
          'Target WAM: the average you need on the rest of your degree.',
          'What-if: the WAM you would have with a given mark in one subject.',
          'Saved only in your browser; back it up to a file and restore it on another device. Your plan and suggestions use it.',
        ],
        steps: ['Add each finished subject and its mark.', 'Read your WAM, set a target and try what-ifs.', 'Add your strengths, interests and goal so the plan and suggestions fit you.'],
        asks: ['What is my WAM so far?', 'What average do I need to reach my target WAM?'],
      },
      final: {
        what: [
          'Pick any subject and its assessment from the Handbook is filled in: each task’s share and the final exam’s share. Different this year? Edit it to match your subject guide.',
          'Type the marks you have so far and see the exam mark you need for each grade: H1 (80), H2A (75), H2B (70), H3 (65) and P (50).',
          'Shows the maths, how rounding works (79.5 counts as 80) and what a hurdle means: a part you must pass by itself, or you get NH.',
          'Kept in your browser only; nothing is sent anywhere.',
        ],
        steps: ['Open the calculator, or open it from a subject page so that subject is already chosen.', 'Type your marks for the parts you’ve done.', 'Read the mark you need on what’s left for each grade.'],
        asks: ['What do I need on the final exam to get an H1 in COMP10001?', 'What’s the lowest exam mark I need to pass this subject?', 'Is there a hurdle in this subject, and what happens if I miss it?'],
      },
      wam: {
        what: [
          'Your WAM from your finished subjects, worked out the University’s way: each mark weighted by its points; pass/fail subjects don’t count.',
          'Target WAM: the average you need on the rest of your degree to reach it.',
          'What-if: type a mark for a subject and see your new WAM, without changing your record.',
          'Kept in your browser only.',
        ],
        steps: ['Add your finished subjects and marks, or start from My record.', 'Read your WAM.', 'Set a target, or try a what-if mark.'],
        asks: ['How is the UniMelb WAM calculated?', 'Can I still reach a 75 or 80 WAM?', 'What will one low mark do to my WAM?'],
      },
      revision: {
        what: [
          'Add your exam dates (filled in from your plan when you have one) and get a day-by-day revision timetable up to your last exam.',
          'Each subject comes back over several days (spaced study), moving from learning to self-testing and timed past papers; harder and earlier exams get more time.',
          'Set your hours a day, rest days and busy days. The day before an exam is that subject only and ends early, and no day runs past 22:00.',
          'Add it to your calendar (.ics) or print it. Saved on your device only.',
        ],
        steps: ['Add the subjects you have exams in and their dates.', 'Set when you start and about how long a day.', 'Follow the timetable; mark a day busy if something comes up.'],
        asks: ['How should I plan my revision for exams?', 'How many hours a day should I study before exams?', 'I have several exams close together: how do I split my time?'],
      },
    },
  },
  'zh-CN': {
    headings: { what: '能做什么', steps: '怎么用', asks: '能回答的问题' },
    guides: {
      plan: {
        what: [
          '按你的学位和专业，一个学期一个学期排好整个学位；学位允许的话，还能加第二专业、辅修或方向。',
          '检查每门课的前修、课程规则（学分、级别、breadth 和学科上限）以及每个学期的负担。每项检查都显示满足、不满足或暂时无法判断。',
          '说明哪个学期太重并建议换课分散压力；挂科的课会重新排进去；超过正常学制时会提醒，这对学生签证很重要。',
          '可以拖动课程换学期、加夏季或冬季学期、看 census date，把排课用链接分享，或打印、存成 PDF。',
        ],
        steps: ['选你的学位、专业和入学学期。', '在“我的记录”里加上已经修完的课（刚入学可以跳过）。', '打开排课：每个学期都已排好并检查过。移动或换课直到每项检查都满足，再到 Handbook 和 My Course Planner 确认。'],
        asks: ['墨大怎么排课？', '我的专业每学期该选哪些课？', '我的学位能不能加第二专业或辅修？', '挂了一门课还能按时毕业吗？'],
      },
      compare: {
        what: ['最多保存五个计划（计划 A、计划 B…），每个都有自己的专业、强项、兴趣和目标。', '并排比较：学位规则是否满足、最后一个学期、负担重的学期、预测 WAM，以及每一门不同的课。'],
        steps: ['在排课里新建第二个计划，每个计划保留自己的专业和目标。', '打开“对比计划”并排查看。'],
        asks: ['该选这个专业还是那个专业？', '我的哪个计划毕业更早、学期更轻松？'],
      },
      recommend: {
        what: ['按你自己的成绩、强项和兴趣，给你能选的课排序，每门都写出理由。', '选一个目标：保 WAM、平衡，或挑战自己。', '只列出你满足前修、近期开课的课。'],
        steps: ['在“我的记录”里加上修完的课和成绩。', '点选你的强项、兴趣和目标（都可以不填，填得越多越准）。', '打开“适合你的课程”（或在“找课”里打开“按我的情况排序”），看每门课下面的理由。'],
        asks: ['墨大下学期该选什么课？', '哪些选修课或 breadth 适合我？', '哪些课对 WAM 友好？'],
      },
      record: {
        what: ['你修完的课和成绩，自动算出 WAM；pass/fail 课和挂科都按学校的规则处理。', '目标 WAM：剩下的课平均要考多少。', '假设计算：某门课考某个分数时，你的 WAM 会变成多少。', '只保存在你的浏览器里；可以备份成文件，在别的设备上恢复。排课和推荐都会用到它。'],
        steps: ['加上每门修完的课和成绩。', '看你的 WAM，设目标，试试假设分数。', '加上强项、兴趣和目标，让排课和推荐更适合你。'],
        asks: ['我现在的 WAM 是多少？', '要达到目标 WAM，剩下的课平均要多少分？'],
      },
      final: {
        what: [
          '选任意一门课，就会填好 Handbook 上的考核：每项作业的占比和期末考试的占比。今年不一样？按你的 subject guide 改就行。',
          '输入目前的分数，就能看到每个等级期末要考多少：H1（80）、H2A（75）、H2B（70）、H3（65）和 P（50）。',
          '写出计算过程、四舍五入的规则（79.5 算 80），以及 hurdle 是什么：必须单独通过的部分，没过就是 NH。',
          '只保存在你的浏览器里，不会发送到任何地方。',
        ],
        steps: ['打开计算器，或者从课程页面打开，这样那门课已经选好。', '输入你已经完成部分的分数。', '看每个等级剩下的部分要考多少。'],
        asks: ['COMP10001 期末要考多少分才能拿 H1？', '这门课期末最少考多少才能过？', '这门课有没有 hurdle，没过会怎样？'],
      },
      wam: {
        what: ['按学校的方式用修完的课算 WAM：每门课的分数按学分加权，pass/fail 课不算。', '目标 WAM：剩下的学位平均要多少分才能达到。', '假设计算：输入某门课的分数，看新的 WAM，不会改动你的记录。', '只保存在你的浏览器里。'],
        steps: ['加上修完的课和成绩，或者从“我的记录”开始。', '看你的 WAM。', '设一个目标，或者试一个假设分数。'],
        asks: ['墨大的 WAM 怎么算？', '我还能拿到 75 或 80 的 WAM 吗？', '一门课考差了，WAM 会掉多少？'],
      },
      revision: {
        what: [
          '加上考试日期（有排课的话会自动填好），就能得到一份到最后一门考试为止的每日复习时间表。',
          '每门课分散在好几天复习（间隔学习），从理解知识到自测，再到限时做往年试卷；越难、越早的考试分到的时间越多。',
          '可以设每天几小时、休息日和忙碌日。考前一天只复习那一门并早点结束，每天都不会超过 22:00。',
          '可以加进日历（.ics）或打印。只保存在你的设备上。',
        ],
        steps: ['加上要考试的课和日期。', '设好开始日期和每天大约多久。', '按时间表复习；哪天有事就标成忙碌。'],
        asks: ['期末复习怎么安排？', '考前每天该学几个小时？', '几门考试挨得很近，时间怎么分？'],
      },
    },
  },
  'zh-TW': {
    headings: { what: '能做什麼', steps: '怎麼用', asks: '能回答的問題' },
    guides: {
      plan: {
        what: [
          '依你的學位和主修，一個學期一個學期排好整個學位；學位允許的話，還能加第二主修、副修或方向。',
          '檢查每門課的先修、課程規則（學分、級別、breadth 和學科上限）以及每個學期的負擔。每項檢查都顯示符合、不符合或暫時無法判斷。',
          '說明哪個學期太重並建議換課分散壓力；被當的課會重新排進去；超過正常修業年限時會提醒，這對學生簽證很重要。',
          '可以拖動課程換學期、加夏季或冬季學期、看 census date，把排課用連結分享，或列印、存成 PDF。',
        ],
        steps: ['選你的學位、主修和入學學期。', '在「我的紀錄」裡加上已經修完的課（剛入學可以跳過）。', '打開排課：每個學期都已排好並檢查過。移動或換課直到每項檢查都符合，再到 Handbook 和 My Course Planner 確認。'],
        asks: ['墨大怎麼排課？', '我的主修每學期該選哪些課？', '我的學位能不能加第二主修或副修？', '被當一門課還能準時畢業嗎？'],
      },
      compare: {
        what: ['最多保存五個計畫（計畫 A、計畫 B…），每個都有自己的主修、強項、興趣和目標。', '並排比較：學位規則是否符合、最後一個學期、負擔重的學期、預測 WAM，以及每一門不同的課。'],
        steps: ['在排課裡新增第二個計畫，每個計畫保留自己的主修和目標。', '打開「比較計畫」並排查看。'],
        asks: ['該選這個主修還是那個主修？', '我的哪個計畫畢業更早、學期更輕鬆？'],
      },
      recommend: {
        what: ['依你自己的成績、強項和興趣，替你能選的課排序，每門都寫出理由。', '選一個目標：保 WAM、平衡，或挑戰自己。', '只列出你符合先修、近期開課的課。'],
        steps: ['在「我的紀錄」裡加上修完的課和成績。', '點選你的強項、興趣和目標（都可以不填，填得越多越準）。', '打開「適合你的課程」（或在「找課」裡打開「按我的情況排序」），看每門課下面的理由。'],
        asks: ['墨大下學期該選什麼課？', '哪些選修課或 breadth 適合我？', '哪些課對 WAM 友善？'],
      },
      record: {
        what: ['你修完的課和成績，自動算出 WAM；pass/fail 課和被當的課都依學校的規則處理。', '目標 WAM：剩下的課平均要考多少。', '假設計算：某門課考某個分數時，你的 WAM 會變成多少。', '只保存在你的瀏覽器裡；可以備份成檔案，在別的裝置上還原。排課和推薦都會用到它。'],
        steps: ['加上每門修完的課和成績。', '看你的 WAM，設目標，試試假設分數。', '加上強項、興趣和目標，讓排課和推薦更適合你。'],
        asks: ['我現在的 WAM 是多少？', '要達到目標 WAM，剩下的課平均要多少分？'],
      },
      final: {
        what: [
          '選任意一門課，就會填好 Handbook 上的評量：每項作業的比重和期末考的比重。今年不一樣？照你的 subject guide 改就行。',
          '輸入目前的分數，就能看到每個等級期末要考多少：H1（80）、H2A（75）、H2B（70）、H3（65）和 P（50）。',
          '寫出計算過程、四捨五入的規則（79.5 算 80），以及 hurdle 是什麼：必須單獨通過的部分，沒過就是 NH。',
          '只保存在你的瀏覽器裡，不會傳送到任何地方。',
        ],
        steps: ['打開計算器，或從課程頁面打開，這樣那門課已經選好。', '輸入你已經完成部分的分數。', '看每個等級剩下的部分要考多少。'],
        asks: ['COMP10001 期末要考多少分才能拿 H1？', '這門課期末最少考多少才能過？', '這門課有沒有 hurdle，沒過會怎樣？'],
      },
      wam: {
        what: ['依學校的方式用修完的課算 WAM：每門課的分數依學分加權，pass/fail 課不算。', '目標 WAM：剩下的學位平均要多少分才能達到。', '假設計算：輸入某門課的分數，看新的 WAM，不會改動你的紀錄。', '只保存在你的瀏覽器裡。'],
        steps: ['加上修完的課和成績，或從「我的紀錄」開始。', '看你的 WAM。', '設一個目標，或試一個假設分數。'],
        asks: ['墨大的 WAM 怎麼算？', '我還能拿到 75 或 80 的 WAM 嗎？', '一門課考差了，WAM 會掉多少？'],
      },
      revision: {
        what: [
          '加上考試日期（有排課的話會自動填好），就能得到一份到最後一科考試為止的每日複習時間表。',
          '每門課分散在好幾天複習（間隔學習），從理解內容到自我測驗，再到限時寫考古題；越難、越早的考試分到的時間越多。',
          '可以設每天幾小時、休息日和忙碌日。考前一天只複習那一科並早點結束，每天都不會超過 22:00。',
          '可以加進行事曆（.ics）或列印。只保存在你的裝置上。',
        ],
        steps: ['加上要考試的課和日期。', '設好開始日期和每天大約多久。', '照時間表複習；哪天有事就標成忙碌。'],
        asks: ['期末複習怎麼安排？', '考前每天該讀幾個小時？', '幾科考試很接近，時間怎麼分？'],
      },
    },
  },
  ja: {
    headings: { what: 'できること', steps: '使い方', asks: '答えられる質問' },
    guides: {
      plan: {
        what: [
          '学位と専攻に合わせて、学位全体を学期ごとに組み立てます。学位が認めていれば、第二専攻・副専攻・スペシャライゼーションも加えられます。',
          '各科目の前提科目、コースのルール（単位数、レベル、ブレッドスと分野の上限）、各学期の負担をチェックします。各チェックは「満たす」「満たさない」「まだ判断できない」で表示されます。',
          '負担の重い学期を説明し、分散させる入れ替えを提案します。不合格の科目は組み直し、通常の年限を超えると警告します（学生ビザでは重要です）。',
          '科目をドラッグして学期を移したり、夏学期・冬学期を加えたり、census date を確認したり、リンクで共有したり、印刷・PDF 保存したりできます。',
        ],
        steps: ['学位、専攻、入学する学期を選びます。', '修了した科目を「自分の記録」に追加します（入学したばかりなら不要）。', '履修計画を開くと、全学期が埋まりチェック済みです。すべてのチェックを満たすまで科目を移動・入れ替えし、Handbook と My Course Planner で確認します。'],
        asks: ['メルボルン大学の履修計画はどう立てる？', '専攻のために各学期どの科目を取るべき？', '第二専攻や副専攻を入れられる？', '科目を落としても予定どおり卒業できる？'],
      },
      compare: {
        what: ['最大5つの計画（プラン A、プラン B…）を保存でき、それぞれ専攻・得意分野・興味・目標を持てます。', '並べて比較：学位ルールの達成、最終学期、重い学期、予測 WAM、異なる科目すべて。'],
        steps: ['履修計画で2つ目のプランを作ります。各プランは専攻と目標を個別に保ちます。', '「プランを比べる」を開いて並べて見ます。'],
        asks: ['この専攻とあの専攻、どちらにすべき？', 'どのプランが早く卒業できて、学期が軽い？'],
      },
      recommend: {
        what: ['自分の成績・得意分野・興味から、履修できる科目を理由付きで並べます。', '目標を選択：WAM を守る、バランス、チャレンジ。', '前提科目を満たし、近く開講される科目だけを表示します。'],
        steps: ['「自分の記録」に修了科目と成績を追加します。', '得意分野・興味・目標をタップします（すべて任意。多く入れるほど精度が上がります）。', '「あなたに合う科目」を開く（または「科目をさがす」で「自分に合う順」をオン）と、各科目の理由が読めます。'],
        asks: ['来学期どの科目を取るべき？', '自分に合う選択科目やブレッドス科目は？', 'WAM に有利な科目は？'],
      },
      record: {
        what: ['修了科目と成績から WAM を計算します。合否のみの科目や不合格は大学と同じ方法で扱います。', '目標 WAM：残りの学位で必要な平均点。', 'もしも計算：ある科目で特定の点を取ったときの WAM。', 'ブラウザにだけ保存。ファイルにバックアップして別の端末で復元できます。履修計画やおすすめにも使われます。'],
        steps: ['修了した科目と成績を追加します。', 'WAM を確認し、目標を設定し、もしも計算を試します。', '得意分野・興味・目標を加えて、計画とおすすめを自分に合わせます。'],
        asks: ['今の WAM はいくつ？', '目標 WAM には残りの科目で平均何点必要？'],
      },
      final: {
        what: [
          '科目を選ぶと Handbook の評価内容（各課題と期末試験の割合）が入力されます。今年は違う？subject guide に合わせて編集できます。',
          'これまでの点数を入れると、各成績に必要な期末試験の点が分かります：H1（80）、H2A（75）、H2B（70）、H3（65）、P（50）。',
          '計算式、四捨五入（79.5 は 80 扱い）、ハードル（単独で合格が必要な部分。落とすと NH）の意味も示します。',
          'ブラウザにだけ保存され、どこにも送信されません。',
        ],
        steps: ['計算ツールを開くか、科目ページから開いてその科目を選んだ状態にします。', '終わった課題の点数を入力します。', '各成績に必要な残りの点を確認します。'],
        asks: ['COMP10001 で H1 を取るには期末で何点必要？', 'この科目に合格するには期末で最低何点？', 'この科目にハードルはある？落としたらどうなる？'],
      },
      wam: {
        what: ['修了科目から大学と同じ方法で WAM を計算：各成績を単位数で重み付けし、合否のみの科目は含めません。', '目標 WAM：達成に必要な残りの平均点。', 'もしも計算：ある科目の点を入れて新しい WAM を確認。記録は変わりません。', 'ブラウザにだけ保存されます。'],
        steps: ['修了科目と成績を追加するか、「自分の記録」から始めます。', 'WAM を確認します。', '目標を設定するか、もしもの点を試します。'],
        asks: ['メルボルン大学の WAM はどう計算する？', 'まだ WAM 75 や 80 に届く？', '1科目の低い点で WAM はどれくらい下がる？'],
      },
      revision: {
        what: [
          '試験日を入れると（履修計画があれば自動入力）、最後の試験までの毎日の復習スケジュールができます。',
          '各科目を数日に分けて復習し（分散学習）、理解から自己テスト、時間を計った過去問へと進みます。難しい試験・早い試験ほど時間を多く配分します。',
          '1日の時間、休みの日、忙しい日を設定できます。試験前日はその科目だけで早めに終わり、22:00 を過ぎる日はありません。',
          'カレンダー（.ics）に追加したり印刷したりできます。端末にだけ保存されます。',
        ],
        steps: ['試験のある科目と日付を追加します。', '開始日と1日の目安時間を設定します。', 'スケジュールに沿って復習し、予定が入った日は「忙しい」にします。'],
        asks: ['試験勉強の計画はどう立てる？', '試験前は1日何時間勉強すべき？', '試験が近くに重なったら時間をどう分ける？'],
      },
    },
  },
  ko: {
    headings: { what: '할 수 있는 일', steps: '사용 방법', asks: '답할 수 있는 질문' },
    guides: {
      plan: {
        what: [
          '학위와 전공에 맞춰 학위 전체를 학기별로 짜 줍니다. 학위가 허용하면 두 번째 전공, 부전공, 세부 전공도 넣을 수 있어요.',
          '모든 과목의 선수과목, 과정 규칙(학점, 레벨, breadth와 학문 분야 한도), 학기별 부담을 확인해요. 각 확인은 충족, 미충족, 아직 판단 불가로 표시돼요.',
          '부담이 큰 학기를 설명하고 분산할 수 있는 교체를 제안해요. 낙제한 과목은 다시 넣고, 정상 기간을 넘기면 알려 줘요(학생 비자에 중요해요).',
          '과목을 끌어서 학기를 옮기고, 여름·겨울 학기를 추가하고, census date를 보고, 링크로 공유하거나 인쇄·PDF로 저장할 수 있어요.',
        ],
        steps: ['학위, 전공, 시작 학기를 고르세요.', '이미 이수한 과목을 "내 기록"에 추가하세요(막 입학했다면 건너뛰어도 돼요).', '계획을 열면 모든 학기가 채워지고 확인돼 있어요. 모든 확인이 충족될 때까지 과목을 옮기거나 바꾼 뒤 Handbook과 My Course Planner에서 확인하세요.'],
        asks: ['멜버른대 수강 계획은 어떻게 짜나요?', '전공을 위해 학기마다 어떤 과목을 들어야 하나요?', '두 번째 전공이나 부전공을 넣을 수 있나요?', '과목을 낙제해도 제때 졸업할 수 있나요?'],
      },
      compare: {
        what: ['최대 다섯 개의 계획(계획 A, 계획 B…)을 저장하고, 각각 전공·강점·관심사·목표를 따로 가질 수 있어요.', '나란히 비교: 학위 규칙 충족 여부, 마지막 학기, 무거운 학기, 예상 WAM, 다른 과목 전부.'],
        steps: ['계획에서 두 번째 계획을 만드세요. 각 계획은 자기 전공과 목표를 유지해요.', '"계획 비교"를 열어 나란히 보세요.'],
        asks: ['이 전공과 저 전공 중 무엇을 해야 할까요?', '어느 계획이 더 빨리 끝나고 학기가 가벼운가요?'],
      },
      recommend: {
        what: ['내 성적, 강점, 관심사를 바탕으로 들을 수 있는 과목을 이유와 함께 순위로 보여 줘요.', '목표 선택: WAM 지키기, 균형, 도전.', '선수과목을 충족하고 곧 개설되는 과목만 보여 줘요.'],
        steps: ['"내 기록"에 이수한 과목과 성적을 추가하세요.', '강점, 관심사, 목표를 누르세요(모두 선택 사항이고, 많이 넣을수록 정확해져요).', '"나에게 맞는 과목"을 열고(또는 과목 찾기에서 "나에게 맞는 순"을 켜고) 각 과목의 이유를 읽어 보세요.'],
        asks: ['다음 학기에 어떤 과목을 들어야 하나요?', '나에게 맞는 선택 과목이나 breadth 과목은?', 'WAM에 유리한 과목은?'],
      },
      record: {
        what: ['이수한 과목과 성적으로 WAM을 계산해요. 패스/페일 과목과 낙제는 학교 방식대로 처리해요.', '목표 WAM: 남은 학위에서 필요한 평균.', '가정 계산: 한 과목에서 특정 점수를 받으면 WAM이 어떻게 되는지.', '브라우저에만 저장돼요. 파일로 백업해 다른 기기에서 복원할 수 있고, 계획과 추천에도 쓰여요.'],
        steps: ['이수한 과목과 성적을 추가하세요.', 'WAM을 확인하고 목표를 정하고 가정 점수를 넣어 보세요.', '강점, 관심사, 목표를 추가해 계획과 추천을 나에게 맞추세요.'],
        asks: ['지금 내 WAM은 얼마인가요?', '목표 WAM에 도달하려면 남은 과목 평균이 얼마여야 하나요?'],
      },
      final: {
        what: [
          '과목을 고르면 Handbook의 평가 항목(과제별 비중과 기말시험 비중)이 채워져요. 올해 다르다면 subject guide에 맞게 고치면 돼요.',
          '지금까지 받은 점수를 넣으면 등급별로 기말시험에서 필요한 점수를 보여 줘요: H1(80), H2A(75), H2B(70), H3(65), P(50).',
          '계산식, 반올림 규칙(79.5는 80으로 계산), 허들(따로 통과해야 하는 부분, 못 넘으면 NH)의 뜻도 알려 줘요.',
          '브라우저에만 저장되고 어디로도 보내지지 않아요.',
        ],
        steps: ['계산기를 열거나, 과목 페이지에서 열어 그 과목이 선택된 상태로 시작하세요.', '끝낸 항목의 점수를 입력하세요.', '등급별로 남은 부분에서 필요한 점수를 확인하세요.'],
        asks: ['COMP10001에서 H1을 받으려면 기말시험에서 몇 점이 필요한가요?', '이 과목을 통과하려면 기말에서 최소 몇 점?', '이 과목에 허들이 있나요? 못 넘으면 어떻게 되나요?'],
      },
      wam: {
        what: ['이수한 과목으로 학교 방식대로 WAM을 계산해요: 각 점수를 학점으로 가중하고, 패스/페일 과목은 빼요.', '목표 WAM: 도달하려면 남은 학위에서 필요한 평균.', '가정 계산: 과목 점수를 넣어 새 WAM을 보고, 기록은 바뀌지 않아요.', '브라우저에만 저장돼요.'],
        steps: ['이수한 과목과 성적을 추가하거나 "내 기록"에서 시작하세요.', 'WAM을 확인하세요.', '목표를 정하거나 가정 점수를 넣어 보세요.'],
        asks: ['멜버른대 WAM은 어떻게 계산하나요?', '아직 WAM 75나 80을 받을 수 있을까요?', '한 과목 점수가 낮으면 WAM이 얼마나 떨어지나요?'],
      },
      revision: {
        what: [
          '시험 날짜를 넣으면(계획이 있으면 자동으로 채워져요) 마지막 시험까지 매일의 복습 시간표를 만들어 줘요.',
          '과목마다 여러 날에 나눠 복습하고(간격 학습), 이해에서 자기 테스트, 시간 재고 기출문제 풀기로 넘어가요. 어렵고 빠른 시험일수록 시간을 더 줘요.',
          '하루 공부 시간, 쉬는 날, 바쁜 날을 정할 수 있어요. 시험 전날은 그 과목만 하고 일찍 끝나며, 22:00를 넘기는 날은 없어요.',
          '캘린더(.ics)에 추가하거나 인쇄할 수 있어요. 기기에만 저장돼요.',
        ],
        steps: ['시험이 있는 과목과 날짜를 추가하세요.', '시작 날짜와 하루 공부 시간을 정하세요.', '시간표대로 복습하고, 일이 생긴 날은 바쁨으로 표시하세요.'],
        asks: ['시험 복습 계획은 어떻게 세우나요?', '시험 전에는 하루 몇 시간 공부해야 하나요?', '시험이 몰려 있으면 시간을 어떻게 나누나요?'],
      },
    },
  },
  vi: {
    headings: { what: 'Làm được gì', steps: 'Cách dùng', asks: 'Câu hỏi nó trả lời' },
    guides: {
      plan: {
        what: [
          'Xếp toàn bộ khóa học theo từng học kỳ cho bằng và chuyên ngành của bạn, thêm chuyên ngành thứ hai, ngành phụ hoặc chuyên sâu nếu bằng cho phép.',
          'Kiểm tra môn tiên quyết của từng môn, quy định của khóa học (tín chỉ, cấp độ, giới hạn breadth và ngành) và độ nặng của mỗi học kỳ. Mỗi mục hiện là đạt, chưa đạt hoặc chưa xác định được.',
          'Giải thích học kỳ nào quá nặng và gợi ý đổi môn để chia đều; xếp lại môn bị trượt; cảnh báo khi kế hoạch kéo dài hơn thời gian chuẩn, điều quan trọng với visa du học.',
          'Kéo môn sang học kỳ khác, thêm kỳ hè hoặc kỳ đông, xem census date, chia sẻ kế hoạch bằng đường link, hoặc in và lưu thành PDF.',
        ],
        steps: ['Chọn bằng, chuyên ngành và học kỳ bắt đầu.', 'Thêm các môn đã học xong ở mục Hồ sơ của tôi (bỏ qua nếu bạn mới bắt đầu).', 'Mở Kế hoạch: mọi học kỳ đã được xếp và kiểm tra. Di chuyển hoặc đổi môn đến khi mọi mục đều đạt, rồi xác nhận trên Handbook và My Course Planner.'],
        asks: ['Lên kế hoạch môn học ở UniMelb thế nào?', 'Mỗi học kỳ nên học môn gì cho chuyên ngành của mình?', 'Có thêm được chuyên ngành thứ hai hoặc ngành phụ không?', 'Trượt một môn thì có tốt nghiệp đúng hạn không?'],
      },
      compare: {
        what: ['Lưu tối đa năm kế hoạch (Kế hoạch A, Kế hoạch B…), mỗi cái có chuyên ngành, thế mạnh, sở thích và mục tiêu riêng.', 'Đặt cạnh nhau: quy định của bằng đã đạt chưa, học kỳ cuối, học kỳ nặng, WAM dự đoán và mọi môn khác nhau.'],
        steps: ['Tạo kế hoạch thứ hai trong trang Kế hoạch; mỗi kế hoạch giữ chuyên ngành và mục tiêu riêng.', 'Mở So sánh kế hoạch để xem cạnh nhau.'],
        asks: ['Nên chọn chuyên ngành này hay chuyên ngành kia?', 'Kế hoạch nào xong sớm hơn hoặc nhẹ hơn?'],
      },
      recommend: {
        what: ['Xếp hạng các môn bạn học được dựa trên điểm, thế mạnh và sở thích của bạn, kèm lý do cho từng môn.', 'Chọn mục tiêu: giữ WAM, cân bằng hoặc thử thách bản thân.', 'Chỉ liệt kê môn bạn đủ điều kiện tiên quyết và sắp mở.'],
        steps: ['Thêm các môn đã học xong và điểm ở Hồ sơ của tôi.', 'Chọn thế mạnh, sở thích và mục tiêu (đều không bắt buộc; càng điền nhiều càng chính xác).', 'Mở Những môn hợp với bạn (hoặc bật Xếp theo mình trong Tìm môn học) và đọc lý do dưới mỗi môn.'],
        asks: ['Học kỳ tới nên học môn gì ở UniMelb?', 'Môn tự chọn hoặc breadth nào hợp với mình?', 'Môn nào tốt cho WAM?'],
      },
      record: {
        what: ['Các môn đã học xong và điểm, kèm WAM được tính sẵn; môn đậu/rớt và môn trượt được xử lý như trường làm.', 'WAM mục tiêu: điểm trung bình bạn cần ở phần còn lại của khóa học.', 'Giả định: WAM sẽ là bao nhiêu nếu bạn đạt một điểm nào đó ở một môn.', 'Chỉ lưu trong trình duyệt; có thể sao lưu ra tệp và khôi phục trên thiết bị khác. Kế hoạch và gợi ý đều dùng nó.'],
        steps: ['Thêm từng môn đã học xong và điểm.', 'Xem WAM, đặt mục tiêu và thử giả định.', 'Thêm thế mạnh, sở thích và mục tiêu để kế hoạch và gợi ý hợp với bạn.'],
        asks: ['WAM hiện tại của mình là bao nhiêu?', 'Cần trung bình bao nhiêu để đạt WAM mục tiêu?'],
      },
      final: {
        what: [
          'Chọn bất kỳ môn nào, phần đánh giá từ Handbook được điền sẵn: tỷ trọng từng bài và của bài thi cuối kỳ. Năm nay khác? Sửa theo subject guide của bạn.',
          'Nhập điểm bạn đã có để thấy điểm thi cuối kỳ cần đạt cho từng mức: H1 (80), H2A (75), H2B (70), H3 (65) và P (50).',
          'Hiện cách tính, quy tắc làm tròn (79.5 tính là 80) và hurdle là gì: phần phải tự đạt riêng, nếu không sẽ bị NH.',
          'Chỉ lưu trong trình duyệt; không gửi đi đâu cả.',
        ],
        steps: ['Mở máy tính, hoặc mở từ trang môn học để môn đó được chọn sẵn.', 'Nhập điểm các phần bạn đã làm.', 'Xem điểm cần đạt ở phần còn lại cho từng mức.'],
        asks: ['Cần bao nhiêu điểm thi cuối kỳ để đạt H1 môn COMP10001?', 'Thi cuối kỳ tối thiểu bao nhiêu để qua môn?', 'Môn này có hurdle không, trượt thì sao?'],
      },
      wam: {
        what: ['Tính WAM từ các môn đã học xong theo cách của trường: điểm mỗi môn nhân theo tín chỉ; môn đậu/rớt không tính.', 'WAM mục tiêu: điểm trung bình cần ở phần còn lại để đạt được.', 'Giả định: nhập điểm một môn để xem WAM mới, không thay đổi hồ sơ.', 'Chỉ lưu trong trình duyệt.'],
        steps: ['Thêm môn đã học xong và điểm, hoặc bắt đầu từ Hồ sơ của tôi.', 'Xem WAM.', 'Đặt mục tiêu hoặc thử một điểm giả định.'],
        asks: ['WAM ở UniMelb tính thế nào?', 'Mình còn đạt WAM 75 hay 80 được không?', 'Một môn điểm thấp làm WAM giảm bao nhiêu?'],
      },
      revision: {
        what: [
          'Nhập ngày thi (tự điền từ kế hoạch nếu có) để có thời gian biểu ôn tập từng ngày đến bài thi cuối cùng.',
          'Mỗi môn được ôn rải ra nhiều ngày (học giãn cách), đi từ hiểu bài sang tự kiểm tra và làm đề cũ có bấm giờ; môn khó hơn và thi sớm hơn được nhiều thời gian hơn.',
          'Đặt số giờ mỗi ngày, ngày nghỉ và ngày bận. Ngày trước kỳ thi chỉ ôn môn đó và kết thúc sớm, không ngày nào quá 22:00.',
          'Thêm vào lịch (.ics) hoặc in ra. Chỉ lưu trên thiết bị của bạn.',
        ],
        steps: ['Thêm các môn có thi và ngày thi.', 'Đặt ngày bắt đầu và khoảng bao lâu mỗi ngày.', 'Ôn theo thời gian biểu; đánh dấu ngày bận nếu có việc.'],
        asks: ['Lên kế hoạch ôn thi thế nào?', 'Trước kỳ thi nên học bao nhiêu giờ mỗi ngày?', 'Nhiều môn thi sát nhau thì chia thời gian thế nào?'],
      },
    },
  },
  id: {
    headings: { what: 'Fungsinya', steps: 'Cara pakai', asks: 'Pertanyaan yang dijawab' },
    guides: {
      plan: {
        what: [
          'Menyusun seluruh studimu per semester untuk gelar dan jurusanmu, ditambah jurusan kedua, minor, atau spesialisasi jika gelarmu mengizinkan.',
          'Memeriksa prasyarat setiap mata kuliah, aturan program (poin, level, batas breadth dan disiplin), dan beratnya tiap semester. Setiap pemeriksaan tampil sebagai terpenuhi, belum terpenuhi, atau belum bisa dipastikan.',
          'Menjelaskan semester yang berat dan menyarankan penukaran agar lebih merata, menjadwalkan ulang mata kuliah yang gagal, dan memberi peringatan bila rencana melewati masa studi normal, yang penting untuk visa pelajar.',
          'Seret mata kuliah antar semester, tambahkan semester musim panas atau musim dingin, lihat census date, bagikan rencana lewat tautan, atau cetak dan simpan sebagai PDF.',
        ],
        steps: ['Pilih gelar, jurusan, dan semester mulai.', 'Tambahkan mata kuliah yang sudah selesai di Catatanku (lewati jika baru mulai).', 'Buka Rencana: setiap semester sudah terisi dan diperiksa. Pindahkan atau tukar mata kuliah sampai semua pemeriksaan terpenuhi, lalu pastikan di Handbook dan My Course Planner.'],
        asks: ['Bagaimana menyusun rencana mata kuliah di UniMelb?', 'Mata kuliah apa yang diambil tiap semester untuk jurusanku?', 'Bisakah aku menambah jurusan kedua atau minor?', 'Apakah aku tetap lulus tepat waktu setelah gagal satu mata kuliah?'],
      },
      compare: {
        what: ['Simpan hingga lima rencana (Rencana A, Rencana B…), masing-masing dengan jurusan, kekuatan, minat, dan tujuannya sendiri.', 'Bandingkan berdampingan: aturan gelar yang terpenuhi, semester terakhir, semester berat, perkiraan WAM, dan setiap mata kuliah yang berbeda.'],
        steps: ['Buat rencana kedua di perencana; tiap rencana menyimpan jurusan dan tujuannya sendiri.', 'Buka Bandingkan rencana untuk melihatnya berdampingan.'],
        asks: ['Sebaiknya ambil jurusan ini atau itu?', 'Rencana mana yang lebih cepat selesai atau semesternya lebih ringan?'],
      },
      recommend: {
        what: ['Mengurutkan mata kuliah yang bisa kamu ambil berdasarkan nilai, kekuatan, dan minatmu, masing-masing dengan alasannya.', 'Pilih tujuan: jaga WAM, seimbang, atau tantang diri.', 'Hanya menampilkan mata kuliah yang prasyaratnya kamu penuhi dan segera dibuka.'],
        steps: ['Tambahkan mata kuliah yang sudah selesai dan nilainya di Catatanku.', 'Ketuk kekuatan, minat, dan tujuanmu (semuanya opsional; makin banyak, makin tepat).', 'Buka Urutkan untukku dan baca alasan di bawah tiap mata kuliah.'],
        asks: ['Mata kuliah apa yang sebaiknya kuambil semester depan di UniMelb?', 'Mata kuliah pilihan atau breadth apa yang cocok untukku?', 'Mata kuliah apa yang bagus untuk WAM?'],
      },
      record: {
        what: ['Mata kuliah yang sudah selesai dan nilainya, dengan WAM yang langsung dihitung; mata kuliah lulus/gagal dan yang gagal diperlakukan seperti aturan universitas.', 'Target WAM: rata-rata yang kamu perlukan di sisa studimu.', 'Andai-andai: WAM-mu jika mendapat nilai tertentu di satu mata kuliah.', 'Hanya tersimpan di browsermu; cadangkan ke berkas dan pulihkan di perangkat lain. Rencana dan saran memakainya.'],
        steps: ['Tambahkan tiap mata kuliah yang selesai beserta nilainya.', 'Lihat WAM-mu, tetapkan target, dan coba andai-andai.', 'Tambahkan kekuatan, minat, dan tujuan agar rencana dan saran cocok untukmu.'],
        asks: ['Berapa WAM-ku sekarang?', 'Berapa rata-rata yang kuperlukan untuk mencapai target WAM?'],
      },
      final: {
        what: [
          'Pilih mata kuliah apa pun dan penilaiannya dari Handbook langsung terisi: bobot tiap tugas dan bobot ujian akhir. Berbeda tahun ini? Ubah sesuai subject guide-mu.',
          'Ketik nilai yang sudah kamu dapat dan lihat nilai ujian akhir yang kamu perlukan untuk tiap grade: H1 (80), H2A (75), H2B (70), H3 (65), dan P (50).',
          'Menunjukkan perhitungannya, aturan pembulatan (79,5 dihitung 80), dan arti hurdle: bagian yang harus lulus sendiri, atau kamu mendapat NH.',
          'Hanya tersimpan di browsermu; tidak dikirim ke mana pun.',
        ],
        steps: ['Buka kalkulator, atau buka dari halaman mata kuliah agar mata kuliah itu sudah terpilih.', 'Ketik nilai untuk bagian yang sudah kamu kerjakan.', 'Baca nilai yang kamu perlukan di sisa penilaian untuk tiap grade.'],
        asks: ['Berapa nilai ujian akhir yang kuperlukan untuk H1 di COMP10001?', 'Berapa nilai ujian terendah agar lulus mata kuliah ini?', 'Apakah mata kuliah ini punya hurdle, dan apa yang terjadi kalau gagal?'],
      },
      wam: {
        what: ['WAM dari mata kuliah yang selesai, dihitung dengan cara universitas: tiap nilai dibobot dengan poinnya; mata kuliah lulus/gagal tidak dihitung.', 'Target WAM: rata-rata yang perlu kamu capai di sisa studi.', 'Andai-andai: ketik nilai satu mata kuliah dan lihat WAM barumu, tanpa mengubah catatanmu.', 'Hanya tersimpan di browsermu.'],
        steps: ['Tambahkan mata kuliah yang selesai dan nilainya, atau mulai dari Catatanku.', 'Lihat WAM-mu.', 'Tetapkan target, atau coba nilai andai-andai.'],
        asks: ['Bagaimana WAM UniMelb dihitung?', 'Apakah aku masih bisa mencapai WAM 75 atau 80?', 'Seberapa besar satu nilai rendah menurunkan WAM-ku?'],
      },
      revision: {
        what: [
          'Masukkan tanggal ujian (terisi dari rencanamu bila ada) dan dapatkan jadwal belajar harian sampai ujian terakhir.',
          'Tiap mata kuliah diulang di beberapa hari (belajar berjarak), dari memahami ke menguji diri dan mengerjakan soal lama dengan waktu; ujian yang lebih sulit dan lebih awal mendapat waktu lebih banyak.',
          'Atur jam per hari, hari istirahat, dan hari sibuk. Sehari sebelum ujian hanya untuk mata kuliah itu dan selesai lebih awal, dan tidak ada hari yang lewat pukul 22:00.',
          'Tambahkan ke kalender (.ics) atau cetak. Hanya tersimpan di perangkatmu.',
        ],
        steps: ['Tambahkan mata kuliah yang ada ujiannya beserta tanggalnya.', 'Atur kapan mulai dan kira-kira berapa lama per hari.', 'Ikuti jadwalnya; tandai hari sibuk bila ada urusan.'],
        asks: ['Bagaimana menyusun jadwal belajar untuk ujian?', 'Berapa jam sehari sebaiknya belajar sebelum ujian?', 'Beberapa ujian berdekatan: bagaimana membagi waktu?'],
      },
    },
  },
  ms: {
    headings: { what: 'Apa yang ia buat', steps: 'Cara guna', asks: 'Soalan yang dijawab' },
    guides: {
      plan: {
        what: [
          'Menyusun seluruh ijazah anda semester demi semester untuk ijazah dan major anda, serta major kedua, minor atau pengkhususan jika ijazah anda membenarkannya.',
          'Menyemak prasyarat setiap subjek, peraturan kursus (mata kredit, tahap, had breadth dan disiplin) dan betapa berat setiap semester. Setiap semakan dipaparkan sebagai dipenuhi, tidak dipenuhi atau belum pasti.',
          'Menerangkan semester yang berat dan mencadangkan pertukaran untuk menyebarkannya, merancang semula subjek yang gagal, dan memberi amaran jika pelan melebihi tempoh biasa, yang penting untuk visa pelajar.',
          'Seret subjek antara semester, tambah semester musim panas atau musim sejuk, lihat census date, kongsi pelan melalui pautan, atau cetak dan simpan sebagai PDF.',
        ],
        steps: ['Pilih ijazah, major dan semester anda bermula.', 'Tambah subjek yang sudah selesai di Rekod saya (langkau jika baru bermula).', 'Buka Pelan: setiap semester sudah diisi dan disemak. Alih atau tukar subjek sehingga semua semakan dipenuhi, kemudian sahkan dalam Handbook dan My Course Planner.'],
        asks: ['Bagaimana merancang subjek di UniMelb?', 'Subjek apa perlu diambil setiap semester untuk major saya?', 'Bolehkah saya tambah major kedua atau minor?', 'Adakah saya masih tamat tepat pada masanya selepas gagal satu subjek?'],
      },
      compare: {
        what: ['Simpan sehingga lima rancangan (Rancangan A, Rancangan B…), setiap satu dengan major, kekuatan, minat dan matlamat sendiri.', 'Letak sebelah-menyebelah: peraturan ijazah yang dipenuhi, semester terakhir, semester berat, ramalan WAM dan setiap subjek yang berbeza.'],
        steps: ['Buat rancangan kedua dalam perancang; setiap rancangan menyimpan major dan matlamatnya sendiri.', 'Buka Banding rancangan untuk melihatnya sebelah-menyebelah.'],
        asks: ['Patutkah saya ambil major ini atau yang itu?', 'Rancangan mana yang tamat lebih awal atau semesternya lebih ringan?'],
      },
      recommend: {
        what: ['Menyusun subjek yang boleh anda ambil berdasarkan markah, kekuatan dan minat anda sendiri, setiap satu dengan sebabnya.', 'Pilih matlamat: lindungi WAM, seimbang atau cabar diri.', 'Hanya menyenaraikan subjek yang prasyaratnya anda penuhi dan akan ditawarkan tidak lama lagi.'],
        steps: ['Tambah subjek yang sudah selesai dan markahnya di Rekod saya.', 'Ketik kekuatan, minat dan matlamat anda (semuanya pilihan; lebih banyak, lebih tepat).', 'Buka Susun untuk saya dan baca sebab di bawah setiap subjek.'],
        asks: ['Subjek UniMelb apa patut saya ambil semester depan?', 'Subjek elektif atau breadth apa sesuai untuk saya?', 'Subjek apa yang baik untuk WAM?'],
      },
      record: {
        what: ['Subjek yang sudah selesai dan markahnya, dengan WAM dikira; subjek lulus/gagal dan kegagalan dikendalikan seperti cara universiti.', 'Sasaran WAM: purata yang anda perlukan untuk baki ijazah.', 'Andaian: WAM anda jika mendapat markah tertentu dalam satu subjek.', 'Disimpan dalam pelayar anda sahaja; sandarkan ke fail dan pulihkan pada peranti lain. Pelan dan cadangan menggunakannya.'],
        steps: ['Tambah setiap subjek yang selesai dan markahnya.', 'Lihat WAM anda, tetapkan sasaran dan cuba andaian.', 'Tambah kekuatan, minat dan matlamat supaya pelan dan cadangan sesuai untuk anda.'],
        asks: ['Berapakah WAM saya sekarang?', 'Berapa purata yang saya perlukan untuk mencapai sasaran WAM?'],
      },
      final: {
        what: [
          'Pilih mana-mana subjek dan pentaksirannya daripada Handbook diisi: wajaran setiap tugasan dan wajaran peperiksaan akhir. Berbeza tahun ini? Ubah mengikut subject guide anda.',
          'Taip markah yang sudah ada dan lihat markah peperiksaan yang diperlukan untuk setiap gred: H1 (80), H2A (75), H2B (70), H3 (65) dan P (50).',
          'Menunjukkan kiraannya, cara pembundaran (79.5 dikira 80) dan maksud hurdle: bahagian yang mesti lulus sendiri, atau anda mendapat NH.',
          'Disimpan dalam pelayar anda sahaja; tiada apa dihantar ke mana-mana.',
        ],
        steps: ['Buka kalkulator, atau buka daripada halaman subjek supaya subjek itu sudah dipilih.', 'Taip markah untuk bahagian yang sudah anda buat.', 'Baca markah yang diperlukan pada baki pentaksiran untuk setiap gred.'],
        asks: ['Berapa markah peperiksaan akhir yang saya perlukan untuk H1 dalam COMP10001?', 'Berapa markah peperiksaan terendah untuk lulus subjek ini?', 'Adakah subjek ini ada hurdle, dan apa berlaku jika saya gagal?'],
      },
      wam: {
        what: ['WAM daripada subjek yang selesai, dikira mengikut cara universiti: setiap markah diberi wajaran mengikut mata kreditnya; subjek lulus/gagal tidak dikira.', 'Sasaran WAM: purata yang diperlukan untuk baki ijazah bagi mencapainya.', 'Andaian: taip markah satu subjek dan lihat WAM baharu, tanpa mengubah rekod anda.', 'Disimpan dalam pelayar anda sahaja.'],
        steps: ['Tambah subjek yang selesai dan markahnya, atau mula daripada Rekod saya.', 'Lihat WAM anda.', 'Tetapkan sasaran, atau cuba markah andaian.'],
        asks: ['Bagaimana WAM UniMelb dikira?', 'Bolehkah saya masih mencapai WAM 75 atau 80?', 'Berapa banyak satu markah rendah menurunkan WAM saya?'],
      },
      revision: {
        what: [
          'Masukkan tarikh peperiksaan (diisi daripada pelan anda jika ada) dan dapatkan jadual ulang kaji harian sehingga peperiksaan terakhir.',
          'Setiap subjek diulang dalam beberapa hari (pembelajaran berjarak), daripada memahami kepada menguji diri dan kertas lepas bermasa; peperiksaan yang lebih sukar dan lebih awal diberi lebih masa.',
          'Tetapkan jam sehari, hari rehat dan hari sibuk. Sehari sebelum peperiksaan hanya untuk subjek itu dan tamat awal, dan tiada hari melepasi pukul 22:00.',
          'Tambah ke kalendar (.ics) atau cetak. Disimpan pada peranti anda sahaja.',
        ],
        steps: ['Tambah subjek yang ada peperiksaan dan tarikhnya.', 'Tetapkan bila bermula dan lebih kurang berapa lama sehari.', 'Ikut jadual; tandakan hari sibuk jika ada urusan.'],
        asks: ['Bagaimana merancang ulang kaji untuk peperiksaan?', 'Berapa jam sehari patut belajar sebelum peperiksaan?', 'Beberapa peperiksaan berdekatan: bagaimana membahagikan masa?'],
      },
    },
  },
  hi: {
    headings: { what: 'यह क्या करता है', steps: 'कैसे इस्तेमाल करें', asks: 'यह किन सवालों का जवाब देता है' },
    guides: {
      plan: {
        what: [
          'आपकी डिग्री और मेजर के हिसाब से पूरी डिग्री को सेमेस्टर-दर-सेमेस्टर बनाता है, और जहाँ डिग्री अनुमति दे वहाँ दूसरा मेजर, माइनर या स्पेशलाइज़ेशन भी।',
          'हर विषय की पूर्वापेक्षाएँ, कोर्स के नियम (क्रेडिट पॉइंट, लेवल, breadth और विषय-क्षेत्र की सीमाएँ) और हर सेमेस्टर का भार जाँचता है। हर जाँच पूरी, अधूरी या अभी तय नहीं के रूप में दिखती है।',
          'भारी सेमेस्टर समझाता है और उन्हें बाँटने के लिए विषय बदलने के सुझाव देता है, फ़ेल हुए विषय दोबारा जोड़ता है, और योजना सामान्य अवधि से लंबी हो तो चेतावनी देता है, जो स्टूडेंट वीज़ा के लिए ज़रूरी है।',
          'विषयों को खींचकर दूसरे सेमेस्टर में ले जाएँ, समर या विंटर टर्म जोड़ें, census date देखें, योजना लिंक से साझा करें, या प्रिंट करके PDF में सहेजें।',
        ],
        steps: ['अपनी डिग्री, मेजर और शुरुआती सेमेस्टर चुनें।', 'पूरे किए हुए विषय "मेरा रिकॉर्ड" में जोड़ें (अभी शुरू कर रहे हैं तो छोड़ दें)।', 'प्लान खोलें: हर सेमेस्टर भरा और जाँचा हुआ है। सब जाँचें पूरी होने तक विषय खिसकाएँ या बदलें, फिर Handbook और My Course Planner में पुष्टि करें।'],
        asks: ['UniMelb में विषयों की योजना कैसे बनाएँ?', 'अपने मेजर के लिए हर सेमेस्टर कौन-से विषय लूँ?', 'क्या मैं दूसरा मेजर या माइनर जोड़ सकता हूँ?', 'एक विषय में फ़ेल होने के बाद भी क्या मैं समय पर डिग्री पूरी कर पाऊँगा?'],
      },
      compare: {
        what: ['पाँच तक योजनाएँ (प्लान A, प्लान B…) रखें, हर एक का अपना मेजर, ताकतें, रुचियाँ और लक्ष्य।', 'साथ-साथ तुलना: डिग्री के नियम पूरे हुए या नहीं, आखिरी सेमेस्टर, भारी सेमेस्टर, अनुमानित WAM और हर अलग विषय।'],
        steps: ['प्लानर में दूसरी योजना बनाएँ; हर योजना अपना मेजर और लक्ष्य रखती है।', '"प्लान की तुलना" खोलकर उन्हें साथ-साथ देखें।'],
        asks: ['यह मेजर लूँ या वह?', 'कौन-सी योजना जल्दी पूरी होती है या जिसके सेमेस्टर हल्के हैं?'],
      },
      recommend: {
        what: ['आपके अपने अंकों, ताकतों और रुचियों से, जो विषय आप ले सकते हैं उन्हें कारण सहित क्रम में रखता है।', 'लक्ष्य चुनें: WAM बचाएँ, संतुलित, या चुनौती।', 'सिर्फ़ वही विषय दिखाता है जिनकी पूर्वापेक्षाएँ आप पूरी करते हैं और जो जल्द चलेंगे।'],
        steps: ['"मेरा रिकॉर्ड" में पूरे किए विषय और अंक जोड़ें।', 'अपनी ताकतें, रुचियाँ और लक्ष्य चुनें (सब वैकल्पिक; जितना ज़्यादा भरेंगे, उतना सटीक)।', '"आपके लिए सही विषय" खोलें (या "सब्जेक्ट खोजें" में "मेरे हिसाब से क्रम" चालू करें) और हर विषय के नीचे कारण पढ़ें।'],
        asks: ['अगले सेमेस्टर UniMelb में कौन-से विषय लूँ?', 'कौन-से ऐच्छिक या breadth विषय मेरे लिए ठीक हैं?', 'कौन-से विषय WAM के लिए अच्छे हैं?'],
      },
      record: {
        what: ['आपके पूरे किए विषय और अंक, WAM की गणना के साथ; पास/फ़ेल विषय और फ़ेल हुए विषय यूनिवर्सिटी के तरीके से गिने जाते हैं।', 'लक्ष्य WAM: बाकी डिग्री में आपको कितना औसत चाहिए।', 'अगर-तो: किसी विषय में कोई अंक आने पर आपका WAM कितना होगा।', 'सिर्फ़ आपके ब्राउज़र में सहेजा जाता है; फ़ाइल में बैकअप लेकर दूसरे डिवाइस पर वापस ला सकते हैं। आपकी योजना और सुझाव इसका इस्तेमाल करते हैं।'],
        steps: ['हर पूरा किया विषय और उसके अंक जोड़ें।', 'अपना WAM देखें, लक्ष्य रखें और अगर-तो आज़माएँ।', 'ताकतें, रुचियाँ और लक्ष्य जोड़ें ताकि योजना और सुझाव आपके हिसाब से हों।'],
        asks: ['अभी मेरा WAM कितना है?', 'लक्ष्य WAM तक पहुँचने के लिए बाकी विषयों में औसत कितना चाहिए?'],
      },
      final: {
        what: [
          'कोई भी विषय चुनें और Handbook से उसका मूल्यांकन भर जाता है: हर काम का हिस्सा और फ़ाइनल परीक्षा का हिस्सा। इस साल अलग है? अपनी subject guide के हिसाब से बदल दें।',
          'अब तक के अंक डालें और हर ग्रेड के लिए परीक्षा में ज़रूरी अंक देखें: H1 (80), H2A (75), H2B (70), H3 (65) और P (50)।',
          'गणना, राउंडिंग का नियम (79.5 को 80 माना जाता है) और hurdle का मतलब दिखाता है: वह हिस्सा जिसे अलग से पास करना ज़रूरी है, वरना NH मिलता है।',
          'सिर्फ़ आपके ब्राउज़र में रहता है; कहीं भेजा नहीं जाता।',
        ],
        steps: ['कैलकुलेटर खोलें, या विषय के पेज से खोलें ताकि वह विषय पहले से चुना हो।', 'जो हिस्से हो चुके हैं उनके अंक डालें।', 'हर ग्रेड के लिए बाकी हिस्से में ज़रूरी अंक पढ़ें।'],
        asks: ['COMP10001 में H1 के लिए फ़ाइनल परीक्षा में कितने अंक चाहिए?', 'इस विषय को पास करने के लिए परीक्षा में कम से कम कितने अंक?', 'क्या इस विषय में hurdle है, और उसमें चूकने पर क्या होता है?'],
      },
      wam: {
        what: ['पूरे किए विषयों से यूनिवर्सिटी के तरीके से WAM: हर अंक उसके क्रेडिट पॉइंट से भारित; पास/फ़ेल विषय नहीं गिने जाते।', 'लक्ष्य WAM: वहाँ पहुँचने के लिए बाकी डिग्री में ज़रूरी औसत।', 'अगर-तो: किसी विषय का अंक डालकर नया WAM देखें, रिकॉर्ड बदले बिना।', 'सिर्फ़ आपके ब्राउज़र में रहता है।'],
        steps: ['पूरे किए विषय और अंक जोड़ें, या "मेरा रिकॉर्ड" से शुरू करें।', 'अपना WAM देखें।', 'लक्ष्य रखें, या अगर-तो अंक आज़माएँ।'],
        asks: ['UniMelb का WAM कैसे निकाला जाता है?', 'क्या मैं अब भी 75 या 80 WAM तक पहुँच सकता हूँ?', 'एक कम अंक से मेरा WAM कितना गिरेगा?'],
      },
      revision: {
        what: [
          'परीक्षा की तारीखें डालें (योजना हो तो अपने आप भर जाती हैं) और आखिरी परीक्षा तक का दिन-ब-दिन रिवीज़न टाइमटेबल पाएँ।',
          'हर विषय कई दिनों में बार-बार आता है (अंतराल पर पढ़ाई), समझने से खुद को परखने और समय बाँधकर पुराने पेपर तक; कठिन और पहले वाली परीक्षाओं को ज़्यादा समय मिलता है।',
          'रोज़ के घंटे, आराम के दिन और व्यस्त दिन तय करें। परीक्षा से पहले का दिन सिर्फ़ उसी विषय का होता है और जल्दी खत्म होता है, और कोई दिन 22:00 के बाद नहीं जाता।',
          'कैलेंडर (.ics) में जोड़ें या प्रिंट करें। सिर्फ़ आपके डिवाइस पर सहेजा जाता है।',
        ],
        steps: ['जिन विषयों की परीक्षा है वे और उनकी तारीखें जोड़ें।', 'कब शुरू करना है और रोज़ लगभग कितना समय, तय करें।', 'टाइमटेबल के अनुसार पढ़ें; कोई काम आ जाए तो उस दिन को व्यस्त चिह्नित करें।'],
        asks: ['परीक्षा के लिए रिवीज़न की योजना कैसे बनाएँ?', 'परीक्षा से पहले रोज़ कितने घंटे पढ़ना चाहिए?', 'कई परीक्षाएँ पास-पास हैं: समय कैसे बाँटूँ?'],
      },
    },
  },
}
