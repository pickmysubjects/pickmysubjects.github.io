import type { LocaleCode } from '@/i18n/codes'

/**
 * The site's update log, newest first, shown on /changes/ (the About page links there).
 * One short entry per day something new went live that students would notice: a date and one
 * sentence (or two or three brief points) in plain words, in all nine languages. Fixes, data
 * updates and internal changes stay out. tests/siteUpdates.test.ts checks the shape.
 */
export interface SiteUpdate {
  /** YYYY-MM-DD */
  date: string
  text: Record<LocaleCode, string>
}

export const SITE_UPDATES: SiteUpdate[] = [
  {
    date: '2026-10-28',
    text: {
      en: 'Search the whole site from the top bar (⌘K): subjects, tools and guide topics.',
      'zh-CN': '顶栏可以全站搜索（⌘K）：课程、工具和入门话题都能搜到。',
      'zh-TW': '頂端列可以全站搜尋（⌘K）：課程、工具和入門主題都搜得到。',
      ja: '上のバーからサイト全体を検索（⌘K）：科目、ツール、ガイドの項目。',
      ko: '상단 바에서 사이트 전체 검색(⌘K): 과목, 도구, 기본 정보.',
      vi: 'Tìm cả trang từ thanh trên cùng (⌘K): môn học, công cụ và hướng dẫn.',
      ms: 'Cari seluruh laman dari bar atas (⌘K): subjek, alatan dan topik panduan.',
      id: 'Cari di seluruh situs dari bar atas (⌘K): matkul, alat, dan topik panduan.',
      hi: 'ऊपर की बार से पूरी साइट खोजें (⌘K): सब्जेक्ट, टूल्स और गाइड के विषय।',
    },
  },
  {
    date: '2026-10-26',
    text: {
      en: 'Related subjects on every subject page, save your plan as an image, and 2027 re-enrolment dates; the site moves to the 2027 Handbook by itself.',
      'zh-CN': '课程页新增相关课程；选课计划可以存成图片；加入 2027 年续选课时间；新 Handbook 出来后网站自动切到 2027。',
      'zh-TW': '課程頁新增相關課程；選課計畫可以存成圖片；加入 2027 年續選課時間；新 Handbook 出來後網站自動切換到 2027。',
      ja: '科目ページに関連科目、履修プランの画像保存、2027年の再履修登録期間を追加。新しいHandbookには自動で切り替わります。',
      ko: '과목 페이지에 관련 과목, 수강 계획 이미지 저장, 2027년 재등록 기간 추가. 새 Handbook으로 자동 전환돼요.',
      vi: 'Trang môn học có môn liên quan, lưu kế hoạch thành ảnh, thêm lịch đăng ký lại 2027; trang tự chuyển sang Handbook 2027.',
      ms: 'Subjek berkaitan di halaman subjek, simpan pelan sebagai gambar dan tarikh pendaftaran semula 2027; laman beralih sendiri ke Handbook 2027.',
      id: 'Mata kuliah terkait di halaman mata kuliah, simpan rencana sebagai gambar, dan jadwal daftar ulang 2027; situs otomatis pindah ke Handbook 2027.',
      hi: 'सब्जेक्ट पेज पर जुड़े हुए सब्जेक्ट, प्लान को इमेज के रूप में सेव करना और 2027 री-एनरोलमेंट की तारीखें; साइट अपने-आप 2027 Handbook पर चली जाती है।'
    },
  },
  {
    date: '2026-10-24',
    text: {
      en: 'Careers pages: pick a job and see the majors and subjects that lead there.',
      'zh-CN': '新增职业页：选一个职业，看哪些专业和课能通往它。',
      'zh-TW': '新增職涯頁：選一個職業，看哪些主修和課程能通往它。',
      ja: '職業ページを追加：仕事を選ぶと、そこにつながる専攻と科目がわかる。',
      ko: '진로 페이지 추가: 직업을 고르면 이어지는 전공과 과목을 보여 줘요.',
      vi: 'Trang nghề nghiệp: chọn một nghề để xem ngành và môn học dẫn tới đó.',
      ms: 'Halaman kerjaya: pilih kerja dan lihat major serta subjek yang membawa ke sana.',
      id: 'Halaman karier: pilih pekerjaan dan lihat jurusan serta mata kuliah yang menuju ke sana.',
      hi: 'करियर पेज: कोई नौकरी चुनें और देखें कौन-से मेजर और सब्जेक्ट वहाँ तक ले जाते हैं।',
    },
  },
]
