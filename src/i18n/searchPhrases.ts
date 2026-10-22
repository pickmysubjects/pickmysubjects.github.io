import type { LocaleCode } from './codes'

/**
 * The everyday ways students in each language search for what the site does ("墨大选课攻略",
 * "easy UniMelb subjects"…), each linked to the page that answers it. Shown on the home page as
 * quick links, and listed in llms.txt, so a search engine or AI assistant can tell which questions
 * the site answers. Every line must stay true: link only to a page that really answers it.
 */
export type SearchTarget = 'plan' | 'recommend' | 'subjects' | 'subjects/easy' | 'subjects/hard' | 'subjects/no-exam' | 'subjects/breadth' | 'subjects/first-semester' | 'subjects/summer-winter' | 'majors' | 'guide'

export interface SearchPhrases {
  heading: string
  items: { text: string; to: SearchTarget }[]
}

export const SEARCH_PHRASES: Record<LocaleCode, SearchPhrases> = {
  en: {
    heading: 'What students search for',
    items: [
      { text: 'UniMelb subject planner / course planner', to: 'plan' },
      { text: 'Easy UniMelb subjects to boost your WAM', to: 'subjects/easy' },
      { text: 'Hardest UniMelb subjects, from student reviews', to: 'subjects/hard' },
      { text: 'UniMelb subjects with no final exam', to: 'subjects/no-exam' },
      { text: 'Best breadth subjects at UniMelb', to: 'subjects/breadth' },
      { text: 'What to take in first semester at UniMelb', to: 'subjects/first-semester' },
      { text: 'UniMelb summer and winter term subjects', to: 'subjects/summer-winter' },
      { text: 'UniMelb subject reviews, difficulty and prerequisites', to: 'subjects' },
      { text: 'UniMelb major, minor and double major requirements', to: 'majors' },
      { text: 'How WAM, credit points and census dates work', to: 'guide' },
      { text: 'Special consideration, MyTimetable clashes and hurdles at UniMelb', to: 'guide' },
    ],
  },
  'zh-CN': {
    heading: '大家常搜',
    items: [
      { text: '墨大选课攻略、墨尔本大学怎么选课', to: 'plan' },
      { text: '墨大水课推荐、好拿分的课（刷 WAM）', to: 'subjects/easy' },
      { text: '墨大难课排行、最难的课', to: 'subjects/hard' },
      { text: '墨大没有期末考试的课', to: 'subjects/no-exam' },
      { text: '墨大 breadth 选什么、breadth 推荐', to: 'subjects/breadth' },
      { text: '墨大新生第一学期选什么课', to: 'subjects/first-semester' },
      { text: '墨大暑期课、冬季课有哪些', to: 'subjects/summer-winter' },
      { text: '墨大课程评价、课程难度、先修课查询', to: 'subjects' },
      { text: '墨大主修要求和必修课、双主修、辅修', to: 'majors' },
      { text: '墨大 WAM 怎么算、学分和 census date', to: 'guide' },
      { text: '墨大 special consideration 怎么申请、选课时间冲突、hurdle', to: 'guide' },
    ],
  },
  'zh-TW': {
    heading: '大家常搜',
    items: [
      { text: '墨大選課攻略、墨爾本大學怎麼選課', to: 'plan' },
      { text: '墨大涼課推薦、好拿分的課（衝 WAM）', to: 'subjects/easy' },
      { text: '墨大難課排行、最難的課', to: 'subjects/hard' },
      { text: '墨大沒有期末考的課', to: 'subjects/no-exam' },
      { text: '墨大 breadth 選什麼、breadth 推薦', to: 'subjects/breadth' },
      { text: '墨大新生第一學期選什麼課', to: 'subjects/first-semester' },
      { text: '墨大暑修、冬季課有哪些', to: 'subjects/summer-winter' },
      { text: '墨大課程評價、課程難度、先修課查詢', to: 'subjects' },
      { text: '墨大主修要求和必修課、雙主修、輔修', to: 'majors' },
      { text: '墨大 WAM 怎麼算、學分和 census date', to: 'guide' },
      { text: '墨大 special consideration 怎麼申請、衝堂、hurdle', to: 'guide' },
    ],
  },
  ja: {
    heading: 'よく検索されていること',
    items: [
      { text: 'メルボルン大学の履修計画・科目選び', to: 'plan' },
      { text: 'メルボルン大学で成績（WAM）を取りやすい科目', to: 'subjects/easy' },
      { text: 'メルボルン大学の難しい科目', to: 'subjects/hard' },
      { text: 'メルボルン大学の期末試験がない科目', to: 'subjects/no-exam' },
      { text: 'メルボルン大学のおすすめブレッドス科目', to: 'subjects/breadth' },
      { text: '1年目の第1学期に取る科目', to: 'subjects/first-semester' },
      { text: 'メルボルン大学の夏学期・冬学期の科目', to: 'subjects/summer-winter' },
      { text: '科目の評判・難易度・前提科目', to: 'subjects' },
      { text: 'メジャー・マイナーの要件、ダブルメジャー', to: 'majors' },
      { text: 'WAM の計算方法、単位、センサス日', to: 'guide' },
      { text: 'メルボルン大学の special consideration、時間割の重複、ハードル', to: 'guide' },
    ],
  },
  ko: {
    heading: '많이 찾는 것',
    items: [
      { text: '멜버른대 수강 신청, 과목 선택 방법', to: 'plan' },
      { text: '멜버른대 학점(WAM) 잘 나오는 과목', to: 'subjects/easy' },
      { text: '멜버른대 어려운 과목', to: 'subjects/hard' },
      { text: '멜버른대 기말시험 없는 과목', to: 'subjects/no-exam' },
      { text: '멜버른대 브레드스 추천 과목', to: 'subjects/breadth' },
      { text: '신입생 1학기 추천 과목', to: 'subjects/first-semester' },
      { text: '멜번대 여름학기·겨울학기 과목', to: 'subjects/summer-winter' },
      { text: '과목 평가, 난이도, 선수 과목 확인', to: 'subjects' },
      { text: '전공·부전공 요건과 필수 과목, 복수전공', to: 'majors' },
      { text: 'WAM 계산법, 학점, census date', to: 'guide' },
      { text: '멜번대 special consideration 신청, 시간표 겹침, 허들', to: 'guide' },
    ],
  },
  vi: {
    heading: 'Sinh viên hay tìm',
    items: [
      { text: 'Cách chọn môn ở Đại học Melbourne (UniMelb)', to: 'plan' },
      { text: 'Môn dễ lấy điểm cao để tăng WAM ở UniMelb', to: 'subjects/easy' },
      { text: 'Các môn khó nhất ở UniMelb', to: 'subjects/hard' },
      { text: 'Các môn không thi cuối kỳ ở UniMelb', to: 'subjects/no-exam' },
      { text: 'Nên chọn môn breadth nào ở UniMelb', to: 'subjects/breadth' },
      { text: 'Năm nhất học kỳ 1 nên học môn gì', to: 'subjects/first-semester' },
      { text: 'Môn học kỳ hè và kỳ đông ở UniMelb', to: 'subjects/summer-winter' },
      { text: 'Đánh giá môn học, độ khó, môn tiên quyết', to: 'subjects' },
      { text: 'Yêu cầu chuyên ngành, ngành phụ và song ngành ở UniMelb', to: 'majors' },
      { text: 'Cách tính WAM, tín chỉ và census date', to: 'guide' },
      { text: 'Special consideration, trùng lịch MyTimetable và hurdle ở UniMelb', to: 'guide' },
    ],
  },
  id: {
    heading: 'Yang sering dicari mahasiswa',
    items: [
      { text: 'Cara memilih mata kuliah di UniMelb', to: 'plan' },
      { text: 'Mata kuliah UniMelb yang mudah dapat nilai tinggi (WAM)', to: 'subjects/easy' },
      { text: 'Mata kuliah UniMelb paling sulit', to: 'subjects/hard' },
      { text: 'Mata kuliah UniMelb tanpa ujian akhir', to: 'subjects/no-exam' },
      { text: 'Rekomendasi mata kuliah breadth UniMelb', to: 'subjects/breadth' },
      { text: 'Mata kuliah untuk semester pertama tahun pertama', to: 'subjects/first-semester' },
      { text: 'Mata kuliah semester musim panas dan musim dingin di UniMelb', to: 'subjects/summer-winter' },
      { text: 'Ulasan, tingkat kesulitan, dan prasyarat mata kuliah', to: 'subjects' },
      { text: 'Syarat major, minor dan double major UniMelb', to: 'majors' },
      { text: 'Cara menghitung WAM, SKS, dan census date', to: 'guide' },
      { text: 'Special consideration, jadwal bentrok di MyTimetable dan hurdle di UniMelb', to: 'guide' },
    ],
  },
  ms: {
    heading: 'Yang selalu dicari pelajar',
    items: [
      { text: 'Cara memilih subjek di UniMelb', to: 'plan' },
      { text: 'Subjek UniMelb yang mudah dapat markah tinggi (WAM)', to: 'subjects/easy' },
      { text: 'Subjek UniMelb paling sukar', to: 'subjects/hard' },
      { text: 'Subjek UniMelb tanpa peperiksaan akhir', to: 'subjects/no-exam' },
      { text: 'Cadangan subjek breadth UniMelb', to: 'subjects/breadth' },
      { text: 'Subjek untuk semester pertama tahun pertama', to: 'subjects/first-semester' },
      { text: 'Subjek semester musim panas dan musim sejuk di UniMelb', to: 'subjects/summer-winter' },
      { text: 'Ulasan, tahap kesukaran dan prasyarat subjek', to: 'subjects' },
      { text: 'Syarat major, minor dan major berganda UniMelb', to: 'majors' },
      { text: 'Cara mengira WAM, mata kredit dan census date', to: 'guide' },
      { text: 'Special consideration, jadual bertembung di MyTimetable dan hurdle di UniMelb', to: 'guide' },
    ],
  },
  hi: {
    heading: 'छात्र अक्सर क्या खोजते हैं',
    items: [
      { text: 'यूनिमेलब में सब्जेक्ट कैसे चुनें (सब्जेक्ट प्लानर)', to: 'plan' },
      { text: 'यूनिमेलब के आसान सब्जेक्ट, अच्छा WAM पाने के लिए', to: 'subjects/easy' },
      { text: 'यूनिमेलब के सबसे कठिन सब्जेक्ट', to: 'subjects/hard' },
      { text: 'यूनिमेलब के बिना फ़ाइनल एग्ज़ाम वाले सब्जेक्ट', to: 'subjects/no-exam' },
      { text: 'यूनिमेलब के अच्छे ब्रेड्थ सब्जेक्ट', to: 'subjects/breadth' },
      { text: 'पहले साल के पहले सेमेस्टर में क्या लें', to: 'subjects/first-semester' },
      { text: 'UniMelb के समर और विंटर टर्म सब्जेक्ट', to: 'subjects/summer-winter' },
      { text: 'सब्जेक्ट रिव्यू, कठिनाई और पूर्व-आवश्यक विषय', to: 'subjects' },
      { text: 'यूनिमेलब मेजर, माइनर और डबल मेजर की ज़रूरतें', to: 'majors' },
      { text: 'WAM, क्रेडिट पॉइंट और census date कैसे काम करते हैं', to: 'guide' },
      { text: 'UniMelb में special consideration, MyTimetable क्लैश और हर्डल', to: 'guide' },
    ],
  },
}
