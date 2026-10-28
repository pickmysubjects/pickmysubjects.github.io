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
      en: 'Search the whole site from the top bar (⌘K). Compare plans has its own page: your plans side by side, rule by rule and semester by semester.',
      'zh-CN': '顶栏可以全站搜索（⌘K）。「计划对比」有了自己的页面：几个计划逐条规则、逐学期并排看。',
      'zh-TW': '頂端列可以全站搜尋（⌘K）。「計畫比較」有了自己的頁面：幾個計畫逐條規則、逐學期並排看。',
      ja: '上のバーからサイト全体を検索（⌘K）。「プランを比較」が専用ページに：ルールごと・学期ごとに並べて見られます。',
      ko: '상단 바에서 사이트 전체 검색(⌘K). ‘계획 비교’가 따로 페이지로: 요건별, 학기별로 나란히 봐요.',
      vi: 'Tìm cả trang từ thanh trên cùng (⌘K). So sánh kế hoạch có trang riêng: các kế hoạch cạnh nhau, theo từng quy định và từng học kỳ.',
      ms: 'Cari seluruh laman dari bar atas (⌘K). Banding rancangan kini ada halaman sendiri: rancangan sebelah-menyebelah, peraturan demi peraturan dan semester demi semester.',
      id: 'Cari di seluruh situs dari bar atas (⌘K). Bandingkan rencana punya halaman sendiri: rencana berdampingan, per aturan dan per semester.',
      hi: 'ऊपर की बार से पूरी साइट खोजें (⌘K)। ‘प्लान की तुलना’ का अपना पेज: प्लान साथ-साथ, नियम दर नियम और सेमेस्टर दर सेमेस्टर।',
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
