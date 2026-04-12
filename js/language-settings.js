// ===== language-settings.js =====
// 다국어 음성 인식 및 발음 분석 시스템

const LanguageSettings = {
  // 지원 언어 목록
  supportedLanguages: {
    'ko-KR': {
      name: '한국어',
      flag: '🇰🇷',
      locale: 'ko-KR',
      fillerWords: ['어', '그', '저', '음', '아', '오', '네', '예', '그냥', '뭐', 'مثل', 'как'],
      commonPatterns: {
        silence: 20, // 허용 침묵 시간 (초)
        optimalWPM: { min: 150, max: 200 },
        optimalWordCount: { min: 100, max: 300 }
      },
      pronunciationRules: {
        checkBatchim: true, // 받침 확인
        checkVowelHarmony: false,
        commonMistakes: ['받침 생략', '된소리 되기', '구개음화']
      }
    },
    'en-US': {
      name: 'English (US)',
      flag: '🇺🇸',
      locale: 'en-US',
      fillerWords: ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'basically', 'right', 'okay'],
      commonPatterns: {
        silence: 15,
        optimalWPM: { min: 130, max: 160 },
        optimalWordCount: { min: 120, max: 250 }
      },
      pronunciationRules: {
        checkThSound: true,
        checkRvsL: false,
        checkVowelLength: true,
        commonMistakes: ['th pronunciation', 'r/l confusion', 'vowel reduction']
      }
    },
    'en-GB': {
      name: 'English (UK)',
      flag: '🇬🇧',
      locale: 'en-GB',
      fillerWords: ['um', 'uh', 'like', 'you know', 'so', 'well', 'actually', 'right', 'okay'],
      commonPatterns: {
        silence: 15,
        optimalWPM: { min: 130, max: 160 },
        optimalWordCount: { min: 120, max: 250 }
      },
      pronunciationRules: {
        checkThSound: true,
        checkRvsL: false,
        checkVowelLength: true,
        commonMistakes: ['th pronunciation', 'non-rhoticity', 't glottalization']
      }
    },
    'zh-CN': {
      name: '中文 (简体)',
      flag: '🇨🇳',
      locale: 'zh-CN',
      fillerWords: ['嗯', '啊', '这个', '那个', '然后', '就是', '嗯哼'],
      commonPatterns: {
        silence: 18,
        optimalWPM: { min: 180, max: 240 },
        optimalWordCount: { min: 150, max: 300 }
      },
      pronunciationRules: {
        checkTones: true,
        checkRetroflex: true,
        commonMistakes: ['tones', 'retroflex initials', 'nasal finals']
      }
    },
    'ja-JP': {
      name: '日本語',
      flag: '🇯🇵',
      locale: 'ja-JP',
      fillerWords: ['えっと', 'あの', 'まあ', 'でも', 'はい', 'うん', 'そう'],
      commonPatterns: {
        silence: 18,
        optimalWPM: { min: 200, max: 280 },
        optimalWordCount: { min: 180, max: 350 }
      },
      pronunciationRules: {
        checkPitchAccent: true,
        checkLongVowels: true,
        checkGeminate: true,
        commonMistakes: ['pitch accent', 'long vowels', 'geminate consonants']
      }
    },
    'es-ES': {
      name: 'Español',
      flag: '🇪🇸',
      locale: 'es-ES',
      fillerWords: ['eh', 'este', 'o sea', 'bueno', 'pues', 'vale', 'sabes'],
      commonPatterns: {
        silence: 15,
        optimalWPM: { min: 140, max: 170 },
        optimalWordCount: { min: 130, max: 260 }
      },
      pronunciationRules: {
        checkRollingR: true,
        checkVowelPurity: true,
        commonMistakes: ['rolling r', 'vowel reduction', 'c/z pronunciation']
      }
    },
    'fr-FR': {
      name: 'Français',
      flag: '🇫🇷',
      locale: 'fr-FR',
      fillerWords: ['euh', 'ben', 'alors', 'donc', 'voilà', 'quoi', 'tu vois'],
      commonPatterns: {
        silence: 15,
        optimalWPM: { min: 140, max: 170 },
        optimalWordCount: { min: 130, max: 260 }
      },
      pronunciationRules: {
        checkNasalVowels: true,
        checkUvularR: true,
        checkLiaison: true,
        commonMistakes: ['nasal vowels', 'uvular r', 'liaison']
      }
    },
    'de-DE': {
      name: 'Deutsch',
      flag: '🇩🇪',
      locale: 'de-DE',
      fillerWords: ['äh', 'ähm', 'also', 'ja', 'ne', 'halt', 'einfach', 'so'],
      commonPatterns: {
        silence: 15,
        optimalWPM: { min: 130, max: 160 },
        optimalWordCount: { min: 120, max: 250 }
      },
      pronunciationRules: {
        checkUmlauts: true,
        checkChSounds: true,
        checkFinalObstruent: true,
        commonMistakes: ['umlauts', 'ich/ach sound', 'final-obstruent devoicing']
      }
    }
  },

  // 현재 선택된 언어 가져오기
  getCurrentLanguage() {
    return localStorage.getItem('sc_speech_lang') || 'ko-KR';
  },

  // 현재 언어 객체 가져오기
  getCurrentLangObject() {
    const currentLang = this.getCurrentLanguage();
    return this.supportedLanguages[currentLang] || this.supportedLanguages['ko-KR'];
  },

  // 언어별 filler words 가져오기
  getFillerWords() {
    const langObj = this.getCurrentLangObject();
    return langObj.fillerWords;
  },

  // 언어별 최적 WPM 범위 가져오기
  getOptimalWPM() {
    const langObj = this.getCurrentLangObject();
    return langObj.commonPatterns.optimalWPM;
  },

  // 언어별 최적 단어 수 범위 가져오기
  getOptimalWordCount() {
    const langObj = this.getCurrentLangObject();
    return langObj.commonPatterns.optimalWordCount;
  },

  // 언어별 발음 분석
  analyzePronunciation(transcript) {
    const langObj = this.getCurrentLangObject();
    const analysis = {
      score: 100,
      issues: [],
      suggestions: [],
      language: langObj.name
    };

    // 언어별 공통 실수 확인
    if (langObj.pronunciationRules.checkBatchim) {
      // 한국어 받침 확인 (간단한 휴리스틱)
      const batchimIssues = this.checkKoreanBatchim(transcript);
      analysis.issues.push(...batchimIssues);
    }

    if (langObj.pronunciationRules.checkThSound) {
      const thIssues = this.checkThSound(transcript);
      analysis.issues.push(...thIssues);
    }

    if (langObj.pronunciationRules.checkTones) {
      // 중국어 성조 분석 (실제 구현에는 더 복잡한 로직 필요)
      analysis.suggestions.push('성조 연습을 추가하세요');
    }

    // filler words 사용 빈도 분석
    const fillerCount = this.countFillerWords(transcript);
    if (fillerCount > 5) {
      analysis.score -= 10;
      analysis.issues.push(`추임새가 ${fillerCount}회 발생했습니다`);
      analysis.suggestions.push('추임새 사용을 줄이세요');
    }

    // 문장 길이 분석
    const sentences = transcript.split(/[.!?。！？]+/).filter(s => s.trim());
    if (sentences.length > 0) {
      const avgLength = transcript.split(/\s+/).length / sentences.length;
      if (avgLength < 5) {
        analysis.score -= 5;
        analysis.suggestions.push('더 긴 문장으로 연습하세요');
      }
    }

    analysis.score = Math.max(0, Math.min(100, analysis.score));
    return analysis;
  },

  // 한국어 받침 확인 (간단한 버전)
  checkKoreanBatchim(transcript) {
    const issues = [];
    // 실제 구현에는 더 정교한 한글 처리 필요
    return issues;
  },

  // th 발음 확인 (영어)
  checkThSound(transcript) {
    const issues = [];
    // th가 포함된 단어 확인
    const thWords = transcript.match(/\b(the|this|that|these|those|think|thought)\b/gi);
    if (thWords && thWords.length > 0) {
      // 실제 발음 분석은 음성 인식 결과로는 어려우므로 제안만
      issues.push('th 발음을 확인하세요');
    }
    return issues;
  },

  // filler words 카운트
  countFillerWords(transcript) {
    const fillers = this.getFillerWords();
    let count = 0;
    const lowerTranscript = transcript.toLowerCase();
    
    fillers.forEach(filler => {
      const regex = new RegExp('\\b' + filler + '\\b', 'gi');
      const matches = lowerTranscript.match(regex);
      if (matches) {
        count += matches.length;
      }
    });
    
    return count;
  },

  // 언어별 피드백 생성
  generateLanguageFeedback(transcript, stats) {
    const langObj = this.getCurrentLangObject();
    const feedback = {
      overall: '',
      strengths: [],
      improvements: [],
      languageSpecific: ''
    };

    // WPM 분석
    const optimalWPM = this.getOptimalWPM();
    if (stats.wpm >= optimalWPM.min && stats.wpm <= optimalWPM.max) {
      feedback.strengths.push(`적절한 말하기 속도 (${stats.wpm} WPM)`);
    } else if (stats.wpm < optimalWPM.min) {
      feedback.improvements.push(`말하기 속도를 높이세요 (현재: ${stats.wpm}, 목표: ${optimalWPM.min}-${optimalWPM.max} WPM)`);
    } else {
      feedback.improvements.push(`말하기 속도를 줄이세요 (현재: ${stats.wpm}, 목표: ${optimalWPM.min}-${optimalWPM.max} WPM)`);
    }

    // 단어 수 분석
    const optimalWordCount = this.getOptimalWordCount();
    if (stats.wordCount >= optimalWordCount.min && stats.wordCount <= optimalWordCount.max) {
      feedback.strengths.push(`적절한 발화량 (${stats.wordCount} 단어)`);
    }

    // 침묵 분석
    if (stats.silenceRate <= 20) {
      feedback.strengths.push('원활한 발화 흐름');
    } else {
      feedback.improvements.push('침묵 시간을 줄이세요');
    }

    // 언어별 특정 피드백
    if (langObj.pronunciationRules.checkBatchim) {
      feedback.languageSpecific = '받침을 명확히 발음하도록 연습하세요.';
    } else if (langObj.pronunciationRules.checkThSound) {
      feedback.languageSpecific = 'th 발음에特别注意하여 연습하세요. 혀를 앞니 사이에 대고 발음합니다.';
    } else if (langObj.pronunciationRules.checkTones) {
      feedback.languageSpecific = '4성 성조에 주의하여 연습하세요.';
    }

    feedback.overall = `총 ${stats.wordCount}단어, ${stats.wpm} WPM으로 ${langObj.name}으로 발표 연습했습니다.`;

    return feedback;
  },

  // 언어 설정 UI 초기화
  initLanguageSelector() {
    const select = document.getElementById('speechLangSelect');
    if (select) {
      select.innerHTML = '';
      
      Object.entries(this.supportedLanguages).forEach(([code, lang]) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${lang.flag} ${lang.name}`;
        
        if (code === this.getCurrentLanguage()) {
          option.selected = true;
        }
        
        select.appendChild(option);
      });

      select.addEventListener('change', (e) => {
        this.setLanguage(e.target.value);
      });
    }
  },

  // 언어 설정 변경
  setLanguage(langCode) {
    if (this.supportedLanguages[langCode]) {
      localStorage.setItem('sc_speech_lang', langCode);
      
      showToast({
        type: 'success',
        title: `${this.supportedLanguages[langCode].flag} 언어가 변경되었습니다`,
        message: this.supportedLanguages[langCode].name,
        duration: 2000
      });

      // 이벤트 발생
      window.dispatchEvent(new CustomEvent('languageChanged', { 
        detail: { language: langCode } 
      }));
    }
  }
};

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  LanguageSettings.initLanguageSelector();
});
