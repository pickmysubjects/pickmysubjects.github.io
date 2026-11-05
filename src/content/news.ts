import type { LocaleCode } from '@/i18n/codes'

/**
 * News from the person who makes the site, newest first: the latest shows on the home page.
 * Each in all nine languages.
 */
export interface NewsItem {
  /** YYYY-MM-DD */
  date: string
  title: Record<LocaleCode, string>
  /** Plain paragraphs, in order. */
  body: Record<LocaleCode, string[]>
  /** A last line before the P.S. (good luck in your exams), signed with Helix's smile. */
  closing?: Record<LocaleCode, string>
  /** A postscript, set apart below. */
  ps?: Record<LocaleCode, string>
  /** The P.S. ends with a link to the privacy and terms page. */
  privacyLink?: boolean
}

export const NEWS: NewsItem[] = [
  {
    date: '2026-11-05',
    title: {
      en: "Thank you for your feedback: 1.0.0 is out by the end of November",
      'zh-CN': "谢谢大家的意见：1.0.0 正式版 11 月底上线",
      'zh-TW': "謝謝大家的意見：1.0.0 正式版 11 月底上線",
      ja: "ご意見ありがとうございます：1.0.0 正式版は 11 月末までに公開",
      ko: "의견 감사합니다: 1.0.0 정식판은 11월 말까지 공개",
      vi: "Cảm ơn góp ý của các bạn: bản 1.0.0 ra trước cuối tháng 11",
      ms: "Terima kasih atas maklum balas anda: 1.0.0 keluar sebelum hujung November",
      id: "Terima kasih atas masukanmu: 1.0.0 rilis sebelum akhir November",
      hi: "आपके सुझावों के लिए धन्यवाद: 1.0.0 नवंबर के अंत तक",
    },
    body: {
      en: [
        "Thank you to everyone who left comments and ideas. The new features you asked for are all going into 1.0.0, which will be out by the end of November.",
        "The site is now on 0.9.2, the last 0.9 version. The 0.9 versions fixed many of the problems you reported: subject details, planning, how hard a subject is, and the suggestions. There have been so many comments that the next changes will all come with 1.0.0.",
        "I was amazed and touched to see so many of you write in to help make the site better. Thank you so much for your support. I made this site so students can get full, useful information even when information is hard to come by, instead of being misled and losing time and money.",
      ],
      'zh-CN': [
        "非常感谢这么多同学留言、提意见。最近我把大家提到的新功能都做进了 1.0.0，正式版会在 11 月底前上线。",
        "现在的版本是 0.9.2，也是 0.9 的最后一版。0.9 版本已经修好了很多同学提到的问题：课程信息、排课、课的难度判断和推荐算法等。因为意见实在太多，之后的改动都会和 1.0.0 一起上线。",
        "看到这么多同学主动提意见、帮忙把网站做得更好，我真的又惊喜又感动，谢谢大家的支持。我做这个网站，是希望大家在信息不对等的情况下，也能尽量拿到全面、有用的信息，不被骗，不白白浪费时间和金钱。",
      ],
      'zh-TW': [
        "非常感謝這麼多同學留言、提意見。最近我把大家提到的新功能都做進了 1.0.0，正式版會在 11 月底前上線。",
        "現在的版本是 0.9.2，也是 0.9 的最後一版。0.9 版本已經修好了很多同學提到的問題：課程資訊、排課、課的難度判斷和推薦演算法等。因為意見實在太多，之後的改動都會和 1.0.0 一起上線。",
        "看到這麼多同學主動提意見、幫忙把網站做得更好，我真的又驚喜又感動，謝謝大家的支持。我做這個網站，是希望大家在資訊不對等的情況下，也能盡量拿到全面、有用的資訊，不被騙，不白白浪費時間和金錢。",
      ],
      ja: [
        "たくさんのコメントやご意見をありがとうございます。いただいた新機能のアイデアはすべて 1.0.0 に入れていて、正式版は 11 月末までに公開します。",
        "現在のバージョンは 0.9 の最終版、0.9.2 です。0.9 では、科目情報、履修プラン、難しさの判定、おすすめのしくみなど、多くの方から指摘された問題を直しました。ご意見がとても多いため、今後の変更はすべて 1.0.0 と一緒に公開します。",
        "こんなに多くの方がサイトを良くするために意見を送ってくださって、本当にうれしく、感激しています。応援ありがとうございます。このサイトは、情報の差がある中でも、だまされたり時間やお金を無駄にしたりせず、必要な情報をできるだけ手に入れられるようにと思って作りました。",
      ],
      ko: [
        "많은 분들이 댓글과 의견을 남겨 주셔서 정말 감사합니다. 말씀해 주신 새 기능은 모두 1.0.0에 넣고 있고, 정식판은 11월 말까지 공개합니다.",
        "지금 버전은 0.9의 마지막인 0.9.2입니다. 0.9 버전에서 과목 정보, 수강 계획, 과목 난이도 판단, 추천 방식 등 많은 분이 알려 주신 문제를 고쳤습니다. 의견이 너무 많아서 앞으로의 변경은 모두 1.0.0과 함께 공개합니다.",
        "이렇게 많은 분이 사이트를 더 좋게 만들려고 의견을 보내 주셔서 정말 놀랍고 감동했습니다. 응원해 주셔서 감사합니다. 정보가 부족한 상황에서도 속거나 시간과 돈을 낭비하지 않고, 필요한 정보를 최대한 얻을 수 있도록 이 사이트를 만들었습니다.",
      ],
      vi: [
        "Cảm ơn rất nhiều bạn đã để lại bình luận và góp ý. Các tính năng mới các bạn đề xuất đều đang được đưa vào 1.0.0, bản chính thức sẽ ra trước cuối tháng 11.",
        "Trang hiện ở bản 0.9.2, bản cuối cùng của 0.9. Các bản 0.9 đã sửa nhiều lỗi các bạn báo: thông tin môn học, xếp kế hoạch, đánh giá độ khó và cách gợi ý môn. Vì góp ý quá nhiều nên các thay đổi tiếp theo sẽ ra cùng bản 1.0.0.",
        "Mình thật sự bất ngờ và xúc động khi thấy rất nhiều bạn gửi góp ý để giúp trang tốt hơn. Cảm ơn các bạn rất nhiều vì đã ủng hộ. Mình làm trang này để sinh viên, kể cả khi thiếu thông tin, vẫn có được thông tin đầy đủ và hữu ích, không bị lừa và không mất thời gian, tiền bạc vô ích.",
      ],
      ms: [
        "Terima kasih kepada semua yang meninggalkan komen dan cadangan. Ciri baharu yang anda minta semuanya dimasukkan ke dalam 1.0.0, yang akan keluar sebelum hujung November.",
        "Laman kini di versi 0.9.2, versi 0.9 yang terakhir. Versi 0.9 telah membetulkan banyak masalah yang dilaporkan: maklumat subjek, perancangan, tahap kesukaran subjek dan cadangan. Komen terlalu banyak, jadi perubahan seterusnya akan keluar bersama 1.0.0.",
        "Saya sangat terharu melihat begitu ramai yang menghantar cadangan untuk membantu menambah baik laman ini. Terima kasih banyak atas sokongan anda. Saya membina laman ini supaya pelajar boleh mendapat maklumat yang lengkap dan berguna walaupun maklumat tidak seimbang, tanpa tertipu atau rugi masa dan wang.",
      ],
      id: [
        "Terima kasih untuk semua yang meninggalkan komentar dan masukan. Fitur baru yang kalian minta sedang dimasukkan ke 1.0.0, versi resminya rilis sebelum akhir November.",
        "Situs sekarang di versi 0.9.2, versi 0.9 terakhir. Versi 0.9 sudah memperbaiki banyak masalah yang kalian laporkan: info mata kuliah, penyusunan rencana, tingkat kesulitan mata kuliah, dan cara rekomendasinya. Karena masukannya sangat banyak, perubahan berikutnya akan rilis bersama 1.0.0.",
        "Saya benar-benar terkejut sekaligus terharu melihat begitu banyak yang mengirim masukan untuk membantu membuat situs ini lebih baik. Terima kasih banyak atas dukungannya. Saya membuat situs ini supaya mahasiswa tetap bisa mendapat informasi yang lengkap dan berguna meski informasinya timpang, tanpa tertipu atau buang waktu dan uang.",
      ],
      hi: [
        "इतने सारे कमेंट और सुझाव देने वाले हर व्यक्ति का धन्यवाद। आपने जो नई सुविधाएँ माँगी थीं, वे सब 1.0.0 में जा रही हैं, जो नवंबर के अंत तक आएगा।",
        "साइट अभी 0.9.2 पर है, जो 0.9 का आखिरी वर्ज़न है। 0.9 वर्ज़न में आपकी बताई कई दिक्कतें ठीक हुईं: विषयों की जानकारी, प्लान बनाना, विषय कितना कठिन है, और सुझाव। सुझाव इतने ज़्यादा हैं कि आगे के सारे बदलाव 1.0.0 के साथ आएँगे।",
        "साइट को बेहतर बनाने के लिए इतने सारे लोगों ने सुझाव भेजे, यह देखकर मैं सच में हैरान और भावुक हूँ। आपके साथ के लिए बहुत-बहुत धन्यवाद। मैंने यह साइट इसलिए बनाई कि जानकारी कम होने पर भी छात्र पूरी और काम की जानकारी पा सकें, गुमराह न हों और समय-पैसा न गँवाएँ।",
      ],
    },
    closing: {
      en: "Good luck in your exams. I hope you all get great marks!",
      'zh-CN': "祝大家考试都考个好成绩！",
      'zh-TW': "祝大家考試都考個好成績！",
      ja: "試験、みなさんがいい点を取れますように！",
      ko: "시험에서 모두 좋은 점수 받으시길 바랍니다!",
      vi: "Chúc các bạn thi thật tốt và được điểm cao!",
      ms: "Semoga semua berjaya dan dapat markah yang baik dalam peperiksaan!",
      id: "Semoga sukses ujiannya dan dapat nilai bagus!",
      hi: "परीक्षा के लिए शुभकामनाएँ, सबके अच्छे अंक आएँ!",
    },
    ps: {
      en: "P.S. The site is completely free and its code is open. Your plans and marks stay in your own browser; the site only receives the feedback and ratings you choose to send, and anonymous visit counts.",
      'zh-CN': "P.S. 这个网站完全免费，代码也完全公开。你的计划、成绩等信息只存在你自己的浏览器里；网站只会收到你主动提交的反馈和评分，以及不记名的访问次数。",
      'zh-TW': "P.S. 這個網站完全免費，程式碼也完全公開。你的計畫、成績等資訊只存在你自己的瀏覽器裡；網站只會收到你主動提交的回饋和評分，以及不記名的造訪次數。",
      ja: "P.S. このサイトは完全に無料で、コードも公開しています。プランや成績はあなたのブラウザの中だけに保存され、サイトに届くのは自分で送ったフィードバックと評価、それに匿名の訪問数だけです。",
      ko: "P.S. 이 사이트는 완전히 무료이고 코드도 공개되어 있습니다. 계획과 성적은 내 브라우저에만 저장되고, 사이트가 받는 것은 직접 보낸 피드백과 평가, 그리고 익명 방문 수뿐입니다.",
      vi: "P.S. Trang hoàn toàn miễn phí và mã nguồn công khai. Kế hoạch và điểm của bạn chỉ lưu trong trình duyệt của bạn; trang chỉ nhận góp ý và đánh giá bạn tự gửi, cùng số lượt truy cập ẩn danh.",
      ms: "P.S. Laman ini percuma sepenuhnya dan kodnya terbuka. Rancangan dan markah anda hanya disimpan dalam pelayar anda sendiri; laman hanya menerima maklum balas dan penilaian yang anda hantar, serta kiraan lawatan tanpa nama.",
      id: "P.S. Situs ini sepenuhnya gratis dan kodenya terbuka. Rencana dan nilaimu hanya tersimpan di browsermu sendiri; situs hanya menerima masukan dan penilaian yang kamu kirim, serta jumlah kunjungan anonim.",
      hi: "P.S. यह साइट पूरी तरह मुफ़्त है और इसका कोड खुला है। आपकी योजनाएँ और अंक सिर्फ़ आपके ब्राउज़र में रहते हैं; साइट को सिर्फ़ वही फ़ीडबैक और रेटिंग मिलती है जो आप भेजते हैं, और गुमनाम विज़िट की गिनती।",
    },
    privacyLink: true,
  },
]
