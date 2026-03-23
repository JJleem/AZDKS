export interface KeywordResult {
  subFolder: string;
  matched: string;
  boost: number;
}

interface KeywordRule {
  keywords: string[];
  subFolder: string;
  boost: number;
}

interface PatternRule {
  pattern: RegExp;
  subFolder: string;
  boost: number;
  label: string;
}

// ═══════════════════════════════════════════════════════════════
// 📌 PATTERN RULES — 정규식 기반 (키워드보다 먼저 체크)
// ═══════════════════════════════════════════════════════════════
const PATTERN_RULES: PatternRule[] = [
  // ── macOS 스크린샷 공식 패턴
  { pattern: /^screenshot\s+\d{4}-\d{2}-\d{2}/i,        subFolder: '스크린샷', boost: 0.34, label: 'macOS 스크린샷' },
  { pattern: /^스크린샷\s+\d{4}-\d{2}-\d{2}/,            subFolder: '스크린샷', boost: 0.34, label: 'macOS 스크린샷(한글)' },
  { pattern: /^화면\s*캡처/,                               subFolder: '스크린샷', boost: 0.34, label: '화면 캡처' },
  { pattern: /^screen\s*shot\s+\d{4}-\d{2}-\d{2}/i,      subFolder: '스크린샷', boost: 0.34, label: 'macOS 구버전 스크린샷' },
  // ── Windows 스크린샷
  { pattern: /^capture\d+/i,                               subFolder: '스크린샷', boost: 0.3,  label: 'Windows 캡처' },
  { pattern: /^snagit/i,                                   subFolder: '스크린샷', boost: 0.32, label: 'Snagit 스크린샷' },
  { pattern: /^snip_/i,                                    subFolder: '스크린샷', boost: 0.32, label: 'Snipping Tool' },

  // ── 카카오톡 저장 패턴
  { pattern: /^kakaotalk_\d+/i,                            subFolder: 'SNS/카카오톡', boost: 0.34, label: '카카오톡 첨부파일' },
  { pattern: /^kakaoimage/i,                               subFolder: 'SNS/카카오톡', boost: 0.34, label: '카카오 이미지' },
  { pattern: /^image\s*\(\d+\)\./,                         subFolder: 'SNS/카카오톡', boost: 0.28, label: '카카오톡 이미지(번호)' },

  // ── WhatsApp 패턴
  { pattern: /^img-\d{8}-wa\d+/i,                         subFolder: 'SNS/WhatsApp', boost: 0.34, label: 'WhatsApp 이미지' },
  { pattern: /^vid-\d{8}-wa\d+/i,                         subFolder: 'SNS/WhatsApp', boost: 0.34, label: 'WhatsApp 영상' },
  { pattern: /^aud-\d{8}-wa\d+/i,                         subFolder: 'SNS/WhatsApp', boost: 0.34, label: 'WhatsApp 오디오' },
  { pattern: /^whatsapp\s+(image|video|audio)/i,           subFolder: 'SNS/WhatsApp', boost: 0.34, label: 'WhatsApp 파일' },

  // ── Telegram 패턴
  { pattern: /^photo_\d{4}-\d{2}-\d{2}/i,                 subFolder: 'SNS/텔레그램', boost: 0.28, label: '텔레그램 사진' },
  { pattern: /^animation_\d{4}-\d{2}-\d{2}/i,             subFolder: 'SNS/텔레그램', boost: 0.28, label: '텔레그램 GIF' },

  // ── iPhone/카메라 DCIM 패턴
  { pattern: /^img_\d{4}/i,                                subFolder: '사진/카메라롤', boost: 0.25, label: 'iPhone 사진' },
  { pattern: /^dsc_\d{4}/i,                                subFolder: '사진/카메라', boost: 0.25, label: 'DSLR 사진' },
  { pattern: /^dscn\d{4}/i,                                subFolder: '사진/카메라', boost: 0.25, label: 'Nikon 사진' },
  { pattern: /^_dsc\d{4}/i,                                subFolder: '사진/카메라', boost: 0.25, label: 'Sony 사진' },
  { pattern: /^p\d{8}_\d{6}/i,                             subFolder: '사진/Android', boost: 0.25, label: 'Samsung 사진' },
  { pattern: /^\d{8}_\d{6}/,                               subFolder: '사진/Android', boost: 0.2,  label: 'Android 사진(날짜패턴)' },
  { pattern: /^raw_\d+/i,                                  subFolder: '사진/RAW', boost: 0.28, label: 'RAW 파일' },

  // ── 날짜 패턴 (YYYYMMDD, YYYY-MM-DD, YYYY_MM_DD)
  { pattern: /(?:^|[_\-\s])(\d{4})[_\-](\d{2})[_\-](\d{2})(?:[_\-\s]|$)/, subFolder: '__DATE__', boost: 0.15, label: '날짜 패턴' },
  { pattern: /(?:^|[_\-\s])(\d{4})(\d{2})(\d{2})(?:[_\-\s]|$)/,            subFolder: '__DATE__', boost: 0.12, label: '날짜 패턴(연속)' },
];

// ═══════════════════════════════════════════════════════════════
// 📌 KEYWORD RULES — 키워드 포함 여부
// ═══════════════════════════════════════════════════════════════
const KEYWORD_RULES: KeywordRule[] = [

  // ── 📱 SNS / 메신저 ──────────────────────────────────────────
  { keywords: ['kakaotalk', '카카오톡', 'kakao', '카톡'], subFolder: 'SNS/카카오톡', boost: 0.32 },
  { keywords: ['instagram', 'insta', 'ig_', 'reel', 'reels', 'story'], subFolder: 'SNS/인스타그램', boost: 0.30 },
  { keywords: ['twitter', 'tweet', 'x_post', 'x_img'], subFolder: 'SNS/트위터', boost: 0.30 },
  { keywords: ['discord', 'disc_'], subFolder: 'SNS/Discord', boost: 0.28 },
  { keywords: ['slack_'], subFolder: 'SNS/Slack', boost: 0.28 },
  { keywords: ['telegram', 'tele_'], subFolder: 'SNS/텔레그램', boost: 0.30 },
  { keywords: ['line_', 'lineapp', 'line-'], subFolder: 'SNS/LINE', boost: 0.30 },
  { keywords: ['youtube', 'yt_', 'youtu'], subFolder: 'SNS/유튜브', boost: 0.28 },
  { keywords: ['tiktok', '틱톡', 'tt_'], subFolder: 'SNS/TikTok', boost: 0.30 },
  { keywords: ['pinterest', 'pin_'], subFolder: 'SNS/Pinterest', boost: 0.28 },
  { keywords: ['facebook', 'fb_', 'meta_'], subFolder: 'SNS/Facebook', boost: 0.28 },
  { keywords: ['linkedin', 'linked_in'], subFolder: 'SNS/LinkedIn', boost: 0.28 },
  { keywords: ['threads_', 'threads-'], subFolder: 'SNS/Threads', boost: 0.28 },
  { keywords: ['reddit', 'subreddit', 'r_', 'upvote'], subFolder: 'SNS/Reddit', boost: 0.28 },
  { keywords: ['twitch', 'twitch_clip', 'clip_'], subFolder: 'SNS/Twitch', boost: 0.28 },
  { keywords: ['bereal', 'be_real'], subFolder: 'SNS/BeReal', boost: 0.30 },
  { keywords: ['whatsapp', 'wa_'], subFolder: 'SNS/WhatsApp', boost: 0.30 },
  { keywords: ['wechat', '위챗', 'weixin'], subFolder: 'SNS/WeChat', boost: 0.30 },
  { keywords: ['snapchat', 'snap_'], subFolder: 'SNS/Snapchat', boost: 0.28 },

  // ── 📸 스크린샷 / 화면캡처 ───────────────────────────────────
  { keywords: ['screenshot', '스크린샷', 'screen shot', 'screencapture', 'screen_capture'], subFolder: '스크린샷', boost: 0.34 },
  { keywords: ['capture', 'snip', 'clip_board', 'printscreen'], subFolder: '스크린샷', boost: 0.28 },
  { keywords: ['화면캡처', '화면캡쳐', '캡처', '캡쳐'], subFolder: '스크린샷', boost: 0.32 },

  // ── 📷 사진 ──────────────────────────────────────────────────
  { keywords: ['selfie', '셀카', '셀피', 'selfportrait'], subFolder: '사진/셀카', boost: 0.28 },
  { keywords: ['profile', 'avatar', '프로필', '아바타'], subFolder: '사진/프로필', boost: 0.26 },
  { keywords: ['photo', '사진'], subFolder: '사진/일반', boost: 0.10 },
  { keywords: ['wallpaper', '배경화면', 'background', 'bg_'], subFolder: '사진/배경화면', boost: 0.28 },
  { keywords: ['meme', '짤', '짤방', 'funny', 'lol_', 'dank'], subFolder: '사진/짤', boost: 0.28 },
  { keywords: ['raw_', '.arw', '.cr2', '.cr3', '.nef', '.dng'], subFolder: '사진/RAW', boost: 0.32 },
  { keywords: ['burst', 'livephoto', 'live_photo', 'portrait_mode'], subFolder: '사진/카메라롤', boost: 0.24 },
  { keywords: ['dcim', 'dsc_', 'dscn', 'img_'], subFolder: '사진/카메라롤', boost: 0.22 },

  // ── 🎞️ 영상 ──────────────────────────────────────────────────
  { keywords: ['vlog', 'v-log', 'daily'], subFolder: '영상/vlog', boost: 0.22 },
  { keywords: ['shorts', 'short_', 'reels'], subFolder: '영상/숏폼', boost: 0.22 },
  { keywords: ['raw_footage', 'footage', 'broll', 'b-roll'], subFolder: '영상/원본', boost: 0.24 },
  { keywords: ['edit', 'edited', '편집본', 'cut_', 'final_cut'], subFolder: '영상/편집', boost: 0.20 },
  { keywords: ['motion', 'ae_', 'after_effects', 'mocha'], subFolder: '영상/모션그래픽', boost: 0.22 },
  { keywords: ['drone', '드론', 'aerial', 'dji_'], subFolder: '영상/드론', boost: 0.28 },
  { keywords: ['timelapse', 'time_lapse', 'slowmo', 'slow_motion', '슬로우모션'], subFolder: '영상/특수촬영', boost: 0.28 },
  { keywords: ['stream', 'obs_', 'recording', 'rec_'], subFolder: '영상/방송', boost: 0.20 },
  { keywords: ['render', 'rendered', '렌더링'], subFolder: '영상/렌더링', boost: 0.22 },

  // ── 🎵 음악 ──────────────────────────────────────────────────
  { keywords: ['music', '음악', 'song', '노래', 'album', '앨범', 'track', 'playlist'], subFolder: '음악/음원', boost: 0.22 },
  { keywords: ['podcast', '팟캐스트', 'episode', 'ep_'], subFolder: '음악/팟캐스트', boost: 0.24 },
  { keywords: ['vocal', '보컬', 'acapella', 'stem_'], subFolder: '음악/스템', boost: 0.24 },
  { keywords: ['beat', 'instrumental', 'loop_', 'sample_'], subFolder: '음악/비트', boost: 0.22 },
  { keywords: ['mix', 'mixdown', 'master', 'mastered'], subFolder: '음악/믹싱', boost: 0.22 },
  { keywords: ['record_', 'recording', '녹음'], subFolder: '음악/녹음', boost: 0.20 },
  { keywords: ['midi', '.mid'], subFolder: '음악/MIDI', boost: 0.28 },
  { keywords: ['sfx', 'sound_effect', '효과음', 'ambience'], subFolder: '음악/효과음', boost: 0.26 },

  // ── ✈️ 여행 ──────────────────────────────────────────────────
  { keywords: ['travel', 'trip', '여행', 'tour', 'vacation', 'holiday', 'journey'], subFolder: '사진/여행', boost: 0.26 },
  { keywords: ['japan', '일본', 'tokyo', 'osaka', 'kyoto', '도쿄', '오사카', '교토', 'hiroshima', 'nara', 'hokkaido', '삿포로'], subFolder: '사진/여행/일본', boost: 0.32 },
  { keywords: ['korea', 'seoul', '서울', 'busan', '부산', 'jeju', '제주', 'gyeongju', '경주', 'incheon', 'daegu'], subFolder: '사진/여행/국내', boost: 0.30 },
  { keywords: ['usa', 'america', 'newyork', 'nyc', 'lasvegas', 'losangeles', 'la_', 'chicago', 'miami', 'hawaii', '하와이', 'sandiego'], subFolder: '사진/여행/미국', boost: 0.30 },
  { keywords: ['europe', 'paris', 'london', 'berlin', 'rome', '유럽', 'amsterdam', 'barcelona', 'madrid', 'vienna', 'prague', 'lisbon', 'athens'], subFolder: '사진/여행/유럽', boost: 0.30 },
  { keywords: ['thailand', '태국', 'bangkok', 'phuket', 'chiangmai'], subFolder: '사진/여행/태국', boost: 0.32 },
  { keywords: ['vietnam', '베트남', 'hanoi', 'danang', 'hochiminh', '호치민', 'hoi_an'], subFolder: '사진/여행/베트남', boost: 0.32 },
  { keywords: ['taiwan', '대만', 'taipei', '타이베이'], subFolder: '사진/여행/대만', boost: 0.32 },
  { keywords: ['china', '중국', 'beijing', 'shanghai', 'shenzhen', '상하이', '베이징'], subFolder: '사진/여행/중국', boost: 0.30 },
  { keywords: ['singapore', '싱가포르'], subFolder: '사진/여행/싱가포르', boost: 0.32 },
  { keywords: ['hongkong', 'hong_kong', '홍콩'], subFolder: '사진/여행/홍콩', boost: 0.32 },
  { keywords: ['maldives', '몰디브', 'bali', '발리', 'indonesia'], subFolder: '사진/여행/동남아', boost: 0.30 },
  { keywords: ['australia', '호주', 'sydney', 'melbourne', 'brisbane'], subFolder: '사진/여행/호주', boost: 0.30 },
  { keywords: ['canada', '캐나다', 'toronto', 'vancouver', 'montreal'], subFolder: '사진/여행/캐나다', boost: 0.30 },
  { keywords: ['dubai', '두바이', 'uae', 'abudhabi'], subFolder: '사진/여행/중동', boost: 0.30 },

  // ── 🍔 음식 ──────────────────────────────────────────────────
  { keywords: ['food', 'meal', '음식', '먹방', 'eat', 'eating', '맛집'], subFolder: '사진/음식', boost: 0.22 },
  { keywords: ['lunch', 'dinner', 'breakfast', 'brunch', '점심', '저녁', '아침', '브런치'], subFolder: '사진/음식', boost: 0.20 },
  { keywords: ['cafe', '카페', 'coffee', '커피', 'dessert', '디저트', 'bakery', '베이커리'], subFolder: '사진/카페', boost: 0.24 },
  { keywords: ['recipe', '레시피', 'cooking', '요리', 'homemade', '홈쿡'], subFolder: '사진/요리', boost: 0.24 },
  { keywords: ['ramen', '라멘', 'sushi', '초밥', 'bbq', '삼겹살', '치킨', 'chicken'], subFolder: '사진/음식', boost: 0.22 },

  // ── 🎨 디자인 ─────────────────────────────────────────────────
  { keywords: ['design', '디자인', 'mockup', 'mock-up', 'prototype', 'wireframe'], subFolder: '디자인/작업물', boost: 0.26 },
  { keywords: ['logo', '로고', 'logotype', 'brandmark'], subFolder: '디자인/로고', boost: 0.28 },
  { keywords: ['icon', '아이콘', 'iconset', 'favicon'], subFolder: '디자인/아이콘', boost: 0.26 },
  { keywords: ['banner', '배너', 'ad_', 'advertisement', 'ads_'], subFolder: '디자인/배너·광고', boost: 0.26 },
  { keywords: ['poster', '포스터', 'flyer', '전단지', 'leaflet'], subFolder: '디자인/포스터', boost: 0.26 },
  { keywords: ['thumbnail', '썸네일', 'thumb_', 'tn_'], subFolder: '디자인/썸네일', boost: 0.28 },
  { keywords: ['ui_', 'ux_', 'interface', 'app_design', 'appdesign'], subFolder: '디자인/UI·UX', boost: 0.24 },
  { keywords: ['illustration', 'illust', '일러스트', 'drawing', '그림', 'artwork', 'art_'], subFolder: '디자인/일러스트', boost: 0.26 },
  { keywords: ['typography', 'font_', '타이포', 'lettering', 'calligraphy'], subFolder: '디자인/타이포그래피', boost: 0.28 },
  { keywords: ['color', 'palette', 'swatch', 'colorscheme', '컬러'], subFolder: '디자인/컬러', boost: 0.24 },
  { keywords: ['template', '템플릿', 'preset', '프리셋'], subFolder: '디자인/템플릿', boost: 0.22 },
  { keywords: ['asset', 'resource', '에셋', 'sprite', 'spritesheet'], subFolder: '디자인/에셋', boost: 0.22 },
  { keywords: ['3d_', '3dmodel', 'render_', 'obj_', 'fbx_', 'blend_'], subFolder: '디자인/3D', boost: 0.28 },

  // ── 💼 업무 / 문서 ───────────────────────────────────────────
  { keywords: ['invoice', '인보이스', '청구서', '세금계산서', 'bill_'], subFolder: '문서/청구서', boost: 0.32 },
  { keywords: ['receipt', '영수증', '결제확인', 'payment_'], subFolder: '문서/영수증', boost: 0.32 },
  { keywords: ['resume', 'cv_', '이력서', 'curriculum'], subFolder: '문서/이력서', boost: 0.32 },
  { keywords: ['portfolio', '포트폴리오', 'portpolio'], subFolder: '문서/포트폴리오', boost: 0.30 },
  { keywords: ['report', '보고서', '리포트', 'report_'], subFolder: '문서/보고서', boost: 0.26 },
  { keywords: ['analysis', '분석', 'analytics', 'insights'], subFolder: '문서/분석', boost: 0.24 },
  { keywords: ['presentation', '발표', '발표자료', 'ppt_', 'deck', 'slides'], subFolder: '문서/발표자료', boost: 0.26 },
  { keywords: ['contract', '계약서', '계약', 'agreement', 'mou_', 'nda_'], subFolder: '문서/계약서', boost: 0.32 },
  { keywords: ['meeting', '회의', 'minutes', 'agenda', '미팅', 'standup'], subFolder: '문서/회의', boost: 0.24 },
  { keywords: ['plan', '기획서', '기획안', 'planning', 'roadmap', '로드맵'], subFolder: '문서/기획', boost: 0.22 },
  { keywords: ['proposal', '제안서', '제안', 'quote_', 'quotation'], subFolder: '문서/제안서', boost: 0.28 },
  { keywords: ['tutorial', '튜토리얼', 'guide', '가이드', 'manual', '매뉴얼', 'howto'], subFolder: '문서/가이드', boost: 0.22 },
  { keywords: ['spec', 'specification', '기능명세', '명세서', 'requirement'], subFolder: '문서/명세서', boost: 0.26 },
  { keywords: ['brief', '브리프', 'brief_'], subFolder: '문서/브리프', boost: 0.24 },
  { keywords: ['feedback', '피드백', 'review_doc', 'comment_'], subFolder: '문서/피드백', boost: 0.20 },
  { keywords: ['certificate', '자격증', '수료증', '인증서', 'certification'], subFolder: '문서/증명서', boost: 0.30 },
  { keywords: ['license', '면허', '허가', 'permit_'], subFolder: '문서/면허·허가', boost: 0.28 },
  { keywords: ['insurance', '보험', '보험증', 'policy_'], subFolder: '문서/보험', boost: 0.28 },
  { keywords: ['tax', '세금', '납세', '국세', '지방세'], subFolder: '문서/세금', boost: 0.30 },
  { keywords: ['bank', '통장', '입출금', 'statement_', 'bankstatement'], subFolder: '문서/은행', boost: 0.28 },
  { keywords: ['id_', 'identification', '신분증', '주민등록', '여권', 'passport'], subFolder: '문서/신분증', boost: 0.30 },
  { keywords: ['summary', '요약', 'recap_', 'overview'], subFolder: '문서/요약', boost: 0.20 },

  // ── 🎓 학업 ──────────────────────────────────────────────────
  { keywords: ['homework', '과제', 'assignment', 'hw_'], subFolder: '학업/과제', boost: 0.28 },
  { keywords: ['exam', '시험', 'test_', 'quiz_', 'midterm', 'final_exam'], subFolder: '학업/시험', boost: 0.28 },
  { keywords: ['lecture', '강의', '강의자료', 'class_', 'lesson_'], subFolder: '학업/강의자료', boost: 0.24 },
  { keywords: ['study', '공부', 'note_', 'notes_', '노트', '필기'], subFolder: '학업/노트', boost: 0.22 },
  { keywords: ['thesis', '논문', 'dissertation', 'paper_'], subFolder: '학업/논문', boost: 0.28 },
  { keywords: ['research', '연구', 'lab_', 'experiment'], subFolder: '학업/연구', boost: 0.24 },
  { keywords: ['textbook', '교재', 'textbook_', 'ebook_', 'syllabus'], subFolder: '학업/교재', boost: 0.24 },
  { keywords: ['transcript', '성적표', '성적', 'grade_'], subFolder: '학업/성적', boost: 0.30 },
  { keywords: ['certificate_course', '수강증', 'completion_'], subFolder: '학업/수료', boost: 0.28 },

  // ── 💻 개발 ──────────────────────────────────────────────────
  { keywords: ['project_', 'proj_'], subFolder: '개발/프로젝트', boost: 0.16 },
  { keywords: ['api_', 'backend', 'frontend', 'server_', 'client_'], subFolder: '개발/코드', boost: 0.16 },
  { keywords: ['debug', 'stacktrace', 'crash_', 'error_log', 'panic_'], subFolder: '개발/로그', boost: 0.24 },
  { keywords: ['log_', 'logfile', 'access_log', 'system_log'], subFolder: '개발/로그', boost: 0.22 },
  { keywords: ['config_', 'setting_', '.env', 'dotenv', 'yaml_', 'json_config'], subFolder: '개발/설정', boost: 0.20 },
  { keywords: ['database', 'db_', 'sql_', 'schema_', 'migration_'], subFolder: '개발/데이터베이스', boost: 0.24 },
  { keywords: ['deploy', 'deployment', 'ci_', 'cd_', 'devops', 'dockerfile', 'docker_'], subFolder: '개발/DevOps', boost: 0.24 },
  { keywords: ['git_', 'github_', 'commit_', 'branch_', 'diff_'], subFolder: '개발/버전관리', boost: 0.22 },
  { keywords: ['test_', 'spec_', 'unittest', 'e2e_'], subFolder: '개발/테스트', boost: 0.20 },
  { keywords: ['figma_dev', 'design_token', 'token_'], subFolder: '개발/디자인토큰', boost: 0.24 },
  { keywords: ['postman', 'api_doc', 'swagger_'], subFolder: '개발/API문서', boost: 0.26 },
  { keywords: ['readme', 'changelog', 'contributing'], subFolder: '개발/문서', boost: 0.24 },

  // ── 🎮 게임 ──────────────────────────────────────────────────
  { keywords: ['game_', 'gaming', '게임', 'gameplay', 'gameshot'], subFolder: '게임', boost: 0.22 },
  { keywords: ['lol_', 'league_', '리그오브레전드'], subFolder: '게임/LoL', boost: 0.30 },
  { keywords: ['valorant_', 'valo_'], subFolder: '게임/Valorant', boost: 0.30 },
  { keywords: ['minecraft', '마인크래프트'], subFolder: '게임/마인크래프트', boost: 0.30 },
  { keywords: ['overwatch', '오버워치'], subFolder: '게임/오버워치', boost: 0.30 },
  { keywords: ['steam_', 'epic_', 'gamepass_'], subFolder: '게임/기타', boost: 0.22 },

  // ── 🏋️ 건강 / 라이프스타일 ──────────────────────────────────
  { keywords: ['workout', 'gym_', 'fitness', '운동', 'exercise', 'training_'], subFolder: '건강/운동', boost: 0.22 },
  { keywords: ['diet', '다이어트', 'calorie', '칼로리', 'meal_plan'], subFolder: '건강/식단', boost: 0.22 },
  { keywords: ['health', '건강', 'medical_', 'hospital_', '진단서', '처방'], subFolder: '건강/의료', boost: 0.26 },
  { keywords: ['yoga', '요가', 'pilates', '필라테스', 'meditation'], subFolder: '건강/요가·필라테스', boost: 0.26 },

  // ── 🏠 부동산 / 생활 ─────────────────────────────────────────
  { keywords: ['real_estate', 'apartment', '아파트', '부동산', 'house_', 'realty'], subFolder: '생활/부동산', boost: 0.28 },
  { keywords: ['interior', '인테리어', 'furniture', '가구', 'renovation'], subFolder: '생활/인테리어', boost: 0.24 },
  { keywords: ['moving', '이사', 'lease', '전세', '월세', '임대'], subFolder: '생활/이사·임대', boost: 0.28 },

  // ── 🛒 쇼핑 / 영수증 ─────────────────────────────────────────
  { keywords: ['order_', '주문', 'purchase_', '구매', 'shopping_'], subFolder: '쇼핑/주문내역', boost: 0.26 },
  { keywords: ['delivery', '배송', 'tracking_', '운송장'], subFolder: '쇼핑/배송', boost: 0.24 },
  { keywords: ['refund', '환불', 'return_', '반품'], subFolder: '쇼핑/환불', boost: 0.26 },

  // ── 🔤 폰트 ──────────────────────────────────────────────────
  { keywords: ['font_', 'typeface', 'otf_', 'ttf_', 'woff_'], subFolder: '폰트', boost: 0.28 },

  // ── 📦 압축 / 아카이브 ───────────────────────────────────────
  { keywords: ['backup', '백업', 'bak_', 'fullbackup'], subFolder: '백업', boost: 0.28 },
  { keywords: ['archive', '아카이브', 'archived_', 'old_'], subFolder: '아카이브', boost: 0.22 },
  { keywords: ['bundle_', 'package_', 'release_', 'dist_'], subFolder: '압축/배포', boost: 0.22 },

  // ── 🗑️ 임시 / 미분류 ─────────────────────────────────────────
  { keywords: ['temp_', 'tmp_', '임시', 'temporary', 'scratch_'], subFolder: '임시', boost: 0.16 },
  { keywords: ['untitled', '제목없음', 'noname', '무제'], subFolder: '임시', boost: 0.14 },
  { keywords: ['test_file', 'testfile', 'sample_', '샘플'], subFolder: '임시/샘플', boost: 0.14 },
];

// ═══════════════════════════════════════════════════════════════
// 📌 FILE SIZE HINTS — 확장자별 크기 기반 카테고리 추론
// ═══════════════════════════════════════════════════════════════
export interface SizeHint {
  subFolder: string;
  reason: string;
  boost: number;
}

export function analyzeSizeHint(ext: string, sizeBytes: number): SizeHint | null {
  const MB = 1024 * 1024;
  // RAW 사진 (10MB+)
  if (['arw','cr2','cr3','nef','orf','rw2','dng','raf'].includes(ext) && sizeBytes > 10 * MB) {
    return { subFolder: '사진/RAW', reason: `RAW 사진 (${(sizeBytes / MB).toFixed(0)}MB)`, boost: 0.30 };
  }
  // 4K 이상 영상 (500MB+)
  if (['mp4','mov','mkv','avi'].includes(ext) && sizeBytes > 500 * MB) {
    return { subFolder: '영상/원본', reason: `대용량 영상 (${(sizeBytes / MB / 1024).toFixed(1)}GB)`, boost: 0.20 };
  }
  // 짧은 영상 = 숏폼 (5MB 이하 mp4)
  if (['mp4','mov'].includes(ext) && sizeBytes < 5 * MB) {
    return { subFolder: '영상/숏폼', reason: `소용량 영상 (${(sizeBytes / MB).toFixed(1)}MB)`, boost: 0.12 };
  }
  // FLAC/WAV 무손실 (큰 오디오)
  if (['flac','wav','aiff'].includes(ext) && sizeBytes > 30 * MB) {
    return { subFolder: '음악/무손실', reason: `무손실 오디오 (${(sizeBytes / MB).toFixed(0)}MB)`, boost: 0.24 };
  }
  // 압축 파일 (100MB+)
  if (['zip','rar','7z','tar','gz'].includes(ext) && sizeBytes > 100 * MB) {
    return { subFolder: '압축/대용량', reason: `대용량 압축파일 (${(sizeBytes / MB).toFixed(0)}MB)`, boost: 0.14 };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
// Main analysis function
// ═══════════════════════════════════════════════════════════════
export function analyzeKeywords(filename: string): KeywordResult | null {
  const lower = filename.toLowerCase();
  // 확장자 제거한 stem
  const stem = lower.replace(/\.[^.]+$/, '');

  // 1) 패턴 룰 먼저
  for (const rule of PATTERN_RULES) {
    const match = stem.match(rule.pattern) ?? lower.match(rule.pattern);
    if (match) {
      // 날짜 패턴 → 폴더 생성
      if (rule.subFolder === '__DATE__') {
        const year = match[1] ?? '';
        const month = match[2] ?? '';
        if (year && month) {
          return { subFolder: `날짜별/${year}/${month}`, matched: match[0].trim(), boost: rule.boost };
        }
        continue;
      }
      return { subFolder: rule.subFolder, matched: match[0], boost: rule.boost };
    }
  }

  // 2) 키워드 룰
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (stem.includes(kw.toLowerCase()) || lower.includes(kw.toLowerCase())) {
        return { subFolder: rule.subFolder, matched: kw, boost: rule.boost };
      }
    }
  }

  // 3) 버전/최종본/초안 패턴 — 문서 확장자일 때만 적용 (이미지·영상엔 무시)
  const DOC_EXTS = new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx','hwp','txt','md','pages','key','numbers','ai','sketch','fig']);
  const ext = lower.split('.').pop() ?? '';
  if (DOC_EXTS.has(ext) || !['png','jpg','jpeg','gif','webp','heic','svg','bmp','mp4','mov','avi','mkv','mp3','wav','flac'].includes(ext)) {
    if (/_v\d+(\.\d+)?$/i.test(stem))                           return { subFolder: '문서/버전관리', matched: '_v', boost: 0.2 };
    if (/_(final|최종|완성|done|finished)(\d*)?$/i.test(stem))  return { subFolder: '문서/최종본',   matched: '_final', boost: 0.25 };
    if (/_(draft|초안|임시|wip)(\d*)?$/i.test(stem))            return { subFolder: '문서/초안',     matched: '_draft', boost: 0.2 };
  }

  return null;
}
