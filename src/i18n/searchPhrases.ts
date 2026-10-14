import type { LocaleCode } from './codes'

/**
 * The everyday ways students in each language search for what the site does ("墨大选课攻略",
 * "easy UniMelb subjects"…), each linked to the page that answers it. Shown on the home page as
 * quick links, and listed in llms.txt, so a search engine or AI assistant can tell which questions
 * the site answers. Every line must stay true: link only to a page that really answers it.
 */
export type SearchTarget = 'plan' | 'recommend' | 'subjects' | 'subjects/no-exam' | 'subjects/breadth' | 'subjects/first-semester' | 'majors' | 'guide'

export interface SearchPhrases {
  heading: string
  items: { text: string; to: SearchTarget }[]
}

export const SEARCH_PHRASES: Record<LocaleCode, SearchPhrases> = {
  en: {
    heading: 'What students search for',
    items: [
      { text: 'UniMelb subject planner / course planner', to: 'plan' },
      { text: 'Easy UniMelb subjects to boost your WAM', to: 'recommend' },
      { text: 'UniMelb subjects with no final exam', to: 'subjects/no-exam' },
      { text: 'Best breadth subjects at UniMelb', to: 'subjects/breadth' },
      { text: 'What to take in first semester at UniMelb', to: 'subjects/first-semester' },
      { text: 'UniMelb subject reviews, difficulty and prerequisites', to: 'subjects' },
      { text: 'Bachelor of Science and Commerce major requirements', to: 'majors' },
      { text: 'How WAM, credit points and census dates work', to: 'guide' },
    ],
  },
  'zh-CN': {
    heading: '大家常搜',
    items: [
      { text: '墨大选课攻略、墨尔本大学怎么选课', to: 'plan' },
      { text: '墨大水课推荐、好拿分的课（刷 WAM）', to: 'recommend' },
      { text: '墨大没有期末考试的课', to: 'subjects/no-exam' },
      { text: '墨大 breadth 选什么、breadth 推荐', to: 'subjects/breadth' },
      { text: '墨大新生第一学期选什么课', to: 'subjects/first-semester' },
      { text: '墨大课程评价、课程难度、先修课查询', to: 'subjects' },
      { text: '墨大理学、商科专业要求和必修课', to: 'majors' },
      { text: '墨大 WAM 怎么算、学分和 census date', to: 'guide' },
    ],
  },
  'zh-TW': {
    heading: '大家常搜',
    items: [
      { text: '墨大選課攻略、墨爾本大學怎麼選課', to: 'plan' },
      { text: '墨大涼課推薦、好拿分的課（衝 WAM）', to: 'recommend' },
      { text: '墨大沒有期末考的課', to: 'subjects/no-exam' },
      { text: '墨大 breadth 選什麼、breadth 推薦', to: 'subjects/breadth' },
      { text: '墨大新生第一學期選什麼課', to: 'subjects/first-semester' },
      { text: '墨大課程評價、課程難度、先修課查詢', to: 'subjects' },
      { text: '墨大理學、商學主修要求和必修課', to: 'majors' },
      { text: '墨大 WAM 怎麼算、學分和 census date', to: 'guide' },
    ],
  },
  ja: {
    heading: 'よく検索されていること',
    items: [
      { text: 'メルボルン大学の履修計画・科目選び', to: 'plan' },
      { text: 'メルボルン大学で成績（WAM）を取りやすい科目', to: 'recommend' },
      { text: 'メルボルン大学の期末試験がない科目', to: 'subjects/no-exam' },
      { text: 'メルボルン大学のおすすめブレッドス科目', to: 'subjects/breadth' },
      { text: '1年目の第1学期に取る科目', to: 'subjects/first-semester' },
      { text: '科目の評判・難易度・前提科目', to: 'subjects' },
      { text: '理学部・商学部の専攻の要件', to: 'majors' },
      { text: 'WAM の計算方法、単位、センサス日', to: 'guide' },
    ],
  },
  ko: {
    heading: '많이 찾는 것',
    items: [
      { text: '멜버른대 수강 신청, 과목 선택 방법', to: 'plan' },
      { text: '멜버른대 학점(WAM) 잘 나오는 과목', to: 'recommend' },
      { text: '멜버른대 기말시험 없는 과목', to: 'subjects/no-exam' },
      { text: '멜버른대 브레드스 추천 과목', to: 'subjects/breadth' },
      { text: '신입생 1학기 추천 과목', to: 'subjects/first-semester' },
      { text: '과목 평가, 난이도, 선수 과목 확인', to: 'subjects' },
      { text: '이학사·상경 전공 요건과 필수 과목', to: 'majors' },
      { text: 'WAM 계산법, 학점, census date', to: 'guide' },
    ],
  },
  vi: {
    heading: 'Sinh viên hay tìm',
    items: [
      { text: 'Cách chọn môn ở Đại học Melbourne (UniMelb)', to: 'plan' },
      { text: 'Môn dễ lấy điểm cao để tăng WAM ở UniMelb', to: 'recommend' },
      { text: 'Các môn không thi cuối kỳ ở UniMelb', to: 'subjects/no-exam' },
      { text: 'Nên chọn môn breadth nào ở UniMelb', to: 'subjects/breadth' },
      { text: 'Năm nhất học kỳ 1 nên học môn gì', to: 'subjects/first-semester' },
      { text: 'Đánh giá môn học, độ khó, môn tiên quyết', to: 'subjects' },
      { text: 'Yêu cầu chuyên ngành Khoa học và Thương mại', to: 'majors' },
      { text: 'Cách tính WAM, tín chỉ và census date', to: 'guide' },
    ],
  },
  id: {
    heading: 'Yang sering dicari mahasiswa',
    items: [
      { text: 'Cara memilih mata kuliah di UniMelb', to: 'plan' },
      { text: 'Mata kuliah UniMelb yang mudah dapat nilai tinggi (WAM)', to: 'recommend' },
      { text: 'Mata kuliah UniMelb tanpa ujian akhir', to: 'subjects/no-exam' },
      { text: 'Rekomendasi mata kuliah breadth UniMelb', to: 'subjects/breadth' },
      { text: 'Mata kuliah untuk semester pertama tahun pertama', to: 'subjects/first-semester' },
      { text: 'Ulasan, tingkat kesulitan, dan prasyarat mata kuliah', to: 'subjects' },
      { text: 'Syarat jurusan Bachelor of Science dan Commerce', to: 'majors' },
      { text: 'Cara menghitung WAM, SKS, dan census date', to: 'guide' },
    ],
  },
  ms: {
    heading: 'Yang selalu dicari pelajar',
    items: [
      { text: 'Cara memilih subjek di UniMelb', to: 'plan' },
      { text: 'Subjek UniMelb yang mudah dapat markah tinggi (WAM)', to: 'recommend' },
      { text: 'Subjek UniMelb tanpa peperiksaan akhir', to: 'subjects/no-exam' },
      { text: 'Cadangan subjek breadth UniMelb', to: 'subjects/breadth' },
      { text: 'Subjek untuk semester pertama tahun pertama', to: 'subjects/first-semester' },
      { text: 'Ulasan, tahap kesukaran dan prasyarat subjek', to: 'subjects' },
      { text: 'Syarat major Bachelor of Science dan Commerce', to: 'majors' },
      { text: 'Cara mengira WAM, mata kredit dan census date', to: 'guide' },
    ],
  },
  hi: {
    heading: 'छात्र अक्सर क्या खोजते हैं',
    items: [
      { text: 'यूनिमेलब में सब्जेक्ट कैसे चुनें (सब्जेक्ट प्लानर)', to: 'plan' },
      { text: 'यूनिमेलब के आसान सब्जेक्ट, अच्छा WAM पाने के लिए', to: 'recommend' },
      { text: 'यूनिमेलब के बिना फ़ाइनल एग्ज़ाम वाले सब्जेक्ट', to: 'subjects/no-exam' },
      { text: 'यूनिमेलब के अच्छे ब्रेड्थ सब्जेक्ट', to: 'subjects/breadth' },
      { text: 'पहले साल के पहले सेमेस्टर में क्या लें', to: 'subjects/first-semester' },
      { text: 'सब्जेक्ट रिव्यू, कठिनाई और पूर्व-आवश्यक विषय', to: 'subjects' },
      { text: 'बैचलर ऑफ़ साइंस और कॉमर्स मेजर की ज़रूरतें', to: 'majors' },
      { text: 'WAM, क्रेडिट पॉइंट और census date कैसे काम करते हैं', to: 'guide' },
    ],
  },
}
