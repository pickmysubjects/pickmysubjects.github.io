import type { LocaleCode } from '@/i18n/codes'

/**
 * What changed on the site lately, newest first, shown on the About page. One line each, in all
 * nine languages; keep the last ten or so and drop older ones.
 */
export interface SiteUpdate {
  /** YYYY-MM-DD */
  date: string
  text: Record<LocaleCode, string>
}

export const SITE_UPDATES: SiteUpdate[] = [
  {
    date: '2026-10-26',
    text: {
      en: 'The site moves to the 2027 Handbook by itself as subjects are updated.',
      'zh-CN': '新 Handbook 录入后网站自动切到 2027，未更新的课会标注年份。',
      'zh-TW': '新 Handbook 輸入後網站自動切換到 2027，尚未更新的課會標註年份。',
      ja: '新しいHandbookが入りしだい2027年版に自動で切り替わり、未更新の科目には年を表示。',
      ko: '새 Handbook이 입력되면 2027년으로 자동 전환, 아직인 과목은 연도 표시.',
      vi: 'Trang tự chuyển sang Handbook 2027 khi từng môn được cập nhật.',
      ms: 'Laman beralih sendiri ke Handbook 2027 apabila subjek dikemas kini.',
      id: 'Situs otomatis pindah ke Handbook 2027 saat mata kuliah diperbarui.',
      hi: 'सब्जेक्ट अपडेट होते ही साइट अपने-आप 2027 Handbook पर चली जाती है।',
    },
  },
  {
    date: '2026-10-26',
    text: {
      en: 'Subject pages show related subjects: what it leads to and what’s often taken with it.',
      'zh-CN': '课程页新增相关课程：学完能接什么课、常和哪些课一起上。',
      'zh-TW': '課程頁新增相關課程：修完能接哪些課、常和哪些課一起修。',
      ja: '科目ページに関連科目を追加：次に取れる科目、よく一緒に取る科目。',
      ko: '과목 페이지에 관련 과목 추가: 다음에 들을 과목, 같이 많이 듣는 과목.',
      vi: 'Trang môn học có thêm môn liên quan: học tiếp môn gì, hay học cùng môn nào.',
      ms: 'Halaman subjek kini tunjuk subjek berkaitan: apa seterusnya dan yang selalu diambil bersama.',
      id: 'Halaman mata kuliah kini menampilkan mata kuliah terkait: lanjutannya dan yang sering diambil bersama.',
      hi: 'सब्जेक्ट पेज पर अब जुड़े हुए सब्जेक्ट: आगे क्या ले सकते हैं, और साथ में अक्सर क्या लिया जाता है।',
    },
  },
  {
    date: '2026-10-26',
    text: {
      en: 'Save your plan as an image to share.',
      'zh-CN': '选课计划可以存成图片分享。',
      'zh-TW': '選課計畫可以存成圖片分享。',
      ja: '履修プランを画像で保存して共有できるように。',
      ko: '수강 계획을 이미지로 저장해 공유할 수 있어요.',
      vi: 'Lưu kế hoạch học thành ảnh để chia sẻ.',
      ms: 'Simpan pelan anda sebagai gambar untuk dikongsi.',
      id: 'Simpan rencana studi sebagai gambar untuk dibagikan.',
      hi: 'अपना प्लान इमेज के रूप में सेव करके शेयर करें।',
    },
  },
  {
    date: '2026-10-26',
    text: {
      en: '2027 re-enrolment dates added to key dates and the guide.',
      'zh-CN': '重要日期和入门指南加入了 2027 年续选课时间。',
      'zh-TW': '重要日期和入門指南加入了 2027 年續選課時間。',
      ja: '重要日程とガイドに2027年の再履修登録期間を追加。',
      ko: '주요 일정과 가이드에 2027년 재등록 기간 추가.',
      vi: 'Thêm thời gian đăng ký lại năm 2027 vào lịch quan trọng và hướng dẫn.',
      ms: 'Tarikh pendaftaran semula 2027 ditambah ke tarikh penting dan panduan.',
      id: 'Jadwal daftar ulang 2027 ditambahkan ke tanggal penting dan panduan.',
      hi: '2027 री-एनरोलमेंट की तारीखें ज़रूरी तारीखों और गाइड में जोड़ी गईं।',
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
  {
    date: '2026-10-24',
    text: {
      en: 'Hints are one short line; the details sit behind a small ⓘ.',
      'zh-CN': '提示都缩成一行，细节放在小 ⓘ 里。',
      'zh-TW': '提示都縮成一行，細節放在小 ⓘ 裡。',
      ja: 'ヒントは短い1行に。詳しくは小さな ⓘ から。',
      ko: '안내는 짧게 한 줄로, 자세한 내용은 작은 ⓘ 안에.',
      vi: 'Gợi ý chỉ còn một dòng ngắn; chi tiết nằm sau nút ⓘ nhỏ.',
      ms: 'Petunjuk kini satu baris pendek; butiran di sebalik ⓘ kecil.',
      id: 'Petunjuk kini satu baris pendek; detailnya di balik ⓘ kecil.',
      hi: 'संकेत अब एक छोटी लाइन में; पूरी जानकारी छोटे ⓘ के पीछे।',
    },
  },
]
