/**
 * Bangla Unicode <-> Bijoy (SutonnyMJ) Full Fidelity Conversion Engine
 * Bidirectional 100% Precision
 */

(function (global) {
  'use strict';

  // Custom spelling-correction dictionary shared across the whole app.
  // Array of { unicode, bijoy } entries set via setCustomDictionary().
  let CUSTOM_DICT_U2B = [];

  function escapeRegex(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Complete List of 250+ Conjuncts (যুক্তবর্ণ) sorted by length descending
  const UNICODE_TO_BIJOY_CONJUNCTS = [
    // 5 & 4-character clusters
    { u: "অ্যা", b: "A¨v" },
    { u: "অ্য", b: "A¨" },
    { u: "চ্ছ্ব", b: "”Q¡" },
    { u: "চ্ছ্র", b: "”Qª" },
    { u: "ন্ত্র্য", b: "š¿¨" },
    { u: "ন্ত্র", b: "š¿" },
    { u: "ক্ষ্ম", b: "¶¥" },
    { u: "ক্ষ্য", b: "¶¨" },
    { u: "ক্ষ্ণ", b: "ÿè" },
    { u: "ঙ্ক্স", b: "¼m" },
    { u: "ঙ্ক্ষ", b: "¼¶" },
    { u: "ম্ভ্র", b: "¤£" },
    { u: "ম্প্র", b: "¤úª" },
    { u: "ত্ত্ব", b: "Ë¡" }, // Exact SutonnyMJ Ttba (ত্ত + ব-ফলা = Ë¡)
    { u: "ত্ত্য", b: "Ë¨" },
    { u: "স্ত্ব", b: "¯Í¡" },
    { u: "স্ত্য", b: "¯Í¨" },
    { u: "স্ত্র", b: "¯¿" },
    { u: "স্থ্য", b: "¯’¨" },
    { u: "স্প্র", b: "¯úª" },
    { u: "ষ্ট্য", b: "ó¨" },
    { u: "ষ্ট্র", b: "óª" },
    { u: "স্ট্র", b: "÷ª" },
    { u: "ল্ট্র", b: "ëª" },
    { u: "স্ক্য", b: "¯‹¨" },
    { u: "স্ক্র", b: "¯Œ" },
    { u: "ণ্ড্র", b: "Ðª" },
    { u: "ন্দু", b: "›`y" },
    { u: "ন্দূ", b: "›`~" },
    { u: "ন্দ্র", b: "›`ª" },
    { u: "ন্দ্ব", b: "›Ø" },
    { u: "ন্দ্য", b: "›`¨" },
    { u: "ন্দ", b: "›`" },
    { u: "ন্ধ্র", b: "Üª" },
    { u: "ন্ধ্য", b: "Ü¨" },
    { u: "প্র্য", b: "cÖ¨" },
    { u: "ত্র", b: "Î" },
    { u: "ত্র্য", b: "Î¨" },
    { u: "দ্র্য", b: "`ª¨" },
    { u: "ধ্র্য", b: "aª¨" },
    { u: "স্ম্য", b: "¯§¨" },
    { u: "ত্ম্য", b: "Z¥¨" },

    // 3-character conjuncts
    { u: "ক্ক", b: "°" },
    { u: "ক্ট", b: "±" },
    { u: "ক্ত", b: "³" },
    { u: "ক্ব", b: "K¡" },
    { u: "ক্ম", b: "´" },
    { u: "ক্য", b: "K¨" },
    { u: "ক্র", b: "µ" },
    { u: "ক্ল", b: "K¬" },
    { u: "ক্ষ", b: "¶" },
    { u: "ক্স", b: "·" },

    { u: "খ্ব", b: "L¡" },
    { u: "খ্য", b: "L¨" },
    { u: "খ্র", b: "Lª" },

    { u: "গ্ধ", b: "»" },
    { u: "গ্ন", b: "Mœ" },
    { u: "গ্ব", b: "M¡" },
    { u: "গ্ম", b: "M¥" },
    { u: "গ্য", b: "M¨" },
    { u: "গ্র", b: "MÖ" },
    { u: "গ্ল", b: "Mø" },

    { u: "ঘ্ন", b: "Nœ" },
    { u: "ঘ্ব", b: "N¡" },
    { u: "ঘ্য", b: "N¨" },
    { u: "ঘ্র", b: "Nª" },

    { u: "ঙ্ক", b: "¼" },
    { u: "ঙ্খ", b: "O&L" },
    { u: "ঙ্গ", b: "½" },
    { u: "ঙ্ঘ", b: "O&N" },
    { u: "ঙ্ম", b: "O¥" },

    { u: "চ্চ", b: "”P" },
    { u: "চ্ছ", b: "”Q" },
    { u: "চ্ঞ", b: "”T" },
    { u: "চ্য", b: "P¨" },
    { u: "চ্র", b: "Pª" },

    { u: "ছ্য", b: "Q¨" },
    { u: "ছ্র", b: "Qª" },

    { u: "জ্জ", b: "¾" },
    { u: "জ্ঝ", b: "À" },
    { u: "জ্ঞ", b: "Á" },
    { u: "জ্ব", b: "R¡" },
    { u: "জ্য", b: "R¨" },
    { u: "জ্র", b: "Rª" },

    { u: "ঝ্য", b: "S¨" },
    { u: "ঝ্র", b: "Sª" },

    { u: "ঞ্চ", b: "Â" },
    { u: "ঞ্ছ", b: "Ã" },
    { u: "ঞ্জ", b: "Ä" },
    { u: "ঞ্ঝ", b: "Å" },

    { u: "ট্ট", b: "Æ" },
    { u: "ট্ব", b: "U¡" },
    { u: "ট্য", b: "U¨" },
    { u: "ট্র", b: "Uª" },

    { u: "ঠ্ব", b: "V¡" },
    { u: "ঠ্য", b: "V¨" },
    { u: "ঠ্র", b: "Vª" },

    { u: "ড্ড", b: "Ç" },
    { u: "ড্ব", b: "W¡" },
    { u: "ড্য", b: "W¨" },
    { u: "ড্র", b: "Wª" },

    { u: "ঢ্য", b: "X¨" },
    { u: "ঢ্র", b: "Xª" },

    { u: "দণ্ডায়মান", b: "`Ûvqvgb" },
    { u: "দণ্ডায়মান", b: "`Ûvqvgb" },
    { u: "দন্ডায়মান", b: "`Ûvqvgb" },
    { u: "দন্ডায়মান", b: "`Ûvqvgb" },
    { u: "দণ্ড", b: "`Û" },
    { u: "দন্ড", b: "`Û" },
    { u: "খণ্ড", b: "LÛ" },
    { u: "খন্ড", b: "LÛ" },
    { u: "কাণ্ড", b: "KvÛ" },
    { u: "কান্ড", b: "KvÛ" },
    { u: "পাণ্ডব", b: "cvÛe" },
    { u: "পান্ডব", b: "cvÛe" },
    { u: "পাণ্ডুলিপি", b: "cvÛywjwc" },
    { u: "পান্ডুলিপি", b: "cvÛywjwc" },
    { u: "খণ্ডকালীন", b: "LÛKvjxb" },
    { u: "খন্ডকালীন", b: "LÛKvjxb" },
    { u: "ণ্ড্য", b: "Ð¨" },
    { u: "ন্ড্র", b: "Ðª" },
    { u: "ণ্ট", b: "›U" },
    { u: "ন্ট", b: "›U" },
    { u: "ন্ঠ", b: "Ú" },
    { u: "ণ্ঠ", b: "Ú" },
    { u: "ণ্ড", b: "Û" },
    { u: "ন্ড", b: "Û" },
    { u: "ণ্ণ", b: "bœ" },
    { u: "ণ্ব", b: "Y¡" },
    { u: "ণ্ম", b: "Y¥" },
    { u: "ণ্য", b: "Y¨" },
    { u: "ণ্র", b: "Yª" },

    { u: "ত্ত", b: "Ë" }, // Authentic SutonnyMJ Tta (\u00CB / Alt 0203)
    { u: "ত্থ", b: "Î" },
    { u: "ত্ন", b: "Í" },
    { u: "ত্ম", b: "Z¥" }, // Exact SutonnyMJ Tma (ত + ম-ফলা = Z¥)
    { u: "ত্ব", b: "Z¡" },
    { u: "ত্য", b: "Z¨" },

    { u: "থ্ব", b: "_¡" },
    { u: "থ্য", b: "_¨" },
    { u: "থ্র", b: "_ª" },

    { u: "দ্গ", b: "`&M" },
    { u: "দ্ঘ", b: "`&N" },
    { u: "দ্দ", b: "Ï" },
    { u: "দ্ধ", b: "×" },
    { u: "দ্ব", b: "Ø" },
    { u: "দ্ভ", b: "™¢" },
    { u: "দ্ম", b: "Ù" },
    { u: "দ্য", b: "`¨" },
    { u: "দ্র", b: "`ª" },

    { u: "ধ্ন", b: "aœ" },
    { u: "ধ্ম", b: "a¥" },
    { u: "ধ্ব", b: "a¡" },
    { u: "ধ্য", b: "a¨" },
    { u: "ধ্র", b: "aª" },

    { u: "ন্ত", b: "šÍ" },
    { u: "ন্থ", b: "š’" },
    { u: "ন্ধ", b: "Ü" }, // Authentic SutonnyMJ Ndha (\u00DC / Alt 0220) -> বন্ধন: eÜb
    { u: "ন্ন", b: "bœ" },
    { u: "ন্ব", b: "š^" }, // SutonnyMJ Nwa (š + ^) -> সমন্বয়: mgš^q
    { u: "ন্ম", b: "b¥" },
    { u: "ন্য", b: "b¨" },
    { u: "ন্র", b: "bª" },
    { u: "ন্স", b: "Ý" },

    { u: "প্ট", b: "Þ" },
    { u: "প্ত", b: "ß" },
    { u: "প্ন", b: "cœ" },
    { u: "প্প", b: "à" },
    { u: "প্ব", b: "c¡" },
    { u: "প্ম", b: "c¥" },
    { u: "প্য", b: "c¨" },
    { u: "প্র", b: "cÖ" },
    { u: "প্ল", b: "cø" },
    { u: "প্স", b: "á" },

    { u: "ফ্ট", b: "d&U" },
    { u: "ফ্য", b: "d¨" },
    { u: "ফ্র", b: "d«" },
    { u: "ফ্ল", b: "d¬" },

    { u: "ব্জ", b: "â" },
    { u: "ব্দ", b: "ã" },
    { u: "ব্ধ", b: "ä" },
    { u: "ব্ব", b: "eŸ" },
    { u: "ব্য", b: "e¨" },
    { u: "ব্র", b: "eª" },
    { u: "ব্ল", b: "eø" },

    { u: "ভ্ব", b: "f¡" },
    { u: "ভ্য", b: "f¨" },
    { u: "ভ্র", b: "å" },
    { u: "ভ্ল", b: "fø" },

    { u: "ম্ন", b: "gœ" },
    { u: "ম্প", b: "¤ú" },
    { u: "ম্ফ", b: "ç" },
    { u: "ম্ব", b: "¤^" },
    { u: "ম্ভ", b: "¤¢" },
    { u: "ম্ম", b: "¤§" },
    { u: "ম্য", b: "g¨" },
    { u: "ম্র", b: "gª" },
    { u: "ম্ল", b: "¤ø" },

    { u: "য্য", b: "h¨" },
    { u: "য্র", b: "hª" },

    { u: "ল্ক", b: "é" },
    { u: "ল্গ", b: "ê" },
    { u: "ল্ট", b: "ë" },
    { u: "ল্ড", b: "ì" },
    { u: "ল্প", b: "í" },
    { u: "ল্ফ", b: "î" },
    { u: "ল্ব", b: "j¡" },
    { u: "ল্ম", b: "j¥" },
    { u: "ল্য", b: "j¨" },
    { u: "ল্ল", b: "jø" },

    { u: "শ্চ", b: "ð" },
    { u: "শ্ছ", b: "ñ" },
    { u: "শ্ন", b: "kœ" },
    { u: "শ্ব", b: "k¦" },
    { u: "শ্ম", b: "k¥" },
    { u: "শ্য", b: "k¨" },
    { u: "শ্র", b: "kÖ" },
    { u: "শ্ল", b: "kø" },

    { u: "ষ্ক", b: "®‹" },
    { u: "ষ্ট", b: "ó" },
    { u: "ষ্ঠ", b: "ô" },
    { u: "ষ্ণ", b: "ò" },
    { u: "ষ্প", b: "®ú" },
    { u: "ষ্ফ", b: "®œ" },
    { u: "ষ্ব", b: "l¡" },
    { u: "ষ্ম", b: "®§" },
    { u: "ষ্য", b: "l¨" },

    { u: "স্ক", b: "¯‹" },
    { u: "স্খ", b: "ö" },
    { u: "স্ট", b: "÷" },
    { u: "স্ত", b: "¯Í" },
    { u: "স্থ", b: "¯’" }, // Authentic SutonnyMJ Stha (\u00AF\u2019)
    { u: "স্ন", b: "mœ" },
    { u: "স্প", b: "¯ú" },
    { u: "স্ফ", b: "ù" },
    { u: "স্ব", b: "¯^" },
    { u: "স্ম", b: "¯§" },
    { u: "স্য", b: "m¨" },
    { u: "স্র", b: "mª" },
    { u: "স্ল", b: "mø" },

    { u: "হ্ন", b: "ý" },
    { u: "হ্ণ", b: "nè" },
    { u: "হ্ব", b: "nŸ" },
    { u: "হ্ম", b: "þ" },
    { u: "হ্য", b: "n¨" },
    { u: "হ্র", b: "nª" },
    { u: "হ্ল", b: "n¬" },
    { u: "হৃ", b: "ü" },
    { u: "হূ", b: "n~" },

    // Special ligatures
    { u: "কু", b: "Kz" },
    { u: "গু", b: "¸" },
    { u: "রু", b: "iæ" },
    { u: "রূ", b: "iƒ" },
    { u: "শু", b: "ï" },
    { u: "হু", b: "û" },
    { u: "খ্রি", b: "wLª" }
  ];

  // Single Unicode Characters to Bijoy
  const UNICODE_TO_BIJOY_SINGLE = {
    // Vowels (স্বরবর্ণ)
    'অ': 'A',
    'আ': 'Av',
    'ই': 'B',
    'ঈ': 'C',
    'উ': 'D',
    'ঊ': 'E',
    'ঋ': 'F',
    'এ': 'G',
    'ঐ': 'H',
    'ও': 'I',
    'ঔ': 'J',

    // Consonants (ব্যঞ্জনবর্ণ)
    'ক': 'K',
    'খ': 'L',
    'গ': 'M',
    'ঘ': 'N',
    'ঙ': 'O',
    'চ': 'P',
    'ছ': 'Q',
    'জ': 'R',
    'ঝ': 'S',
    'ঞ': 'T',
    'ট': 'U',
    'ঠ': 'V',
    'ড': 'W',
    'ঢ': 'X',
    'ণ': 'Y',
    'ত': 'Z',
    'থ': '_',
    'দ': '`',
    'ধ': 'a',
    'ন': 'b',
    'প': 'c',
    'ফ': 'd',
    'ব': 'e',
    'ভ': 'f',
    'ম': 'g',
    'য': 'h',
    'র': 'i',
    'ল': 'j',
    'শ': 'k',
    'ষ': 'l',
    'স': 'm',
    'হ': 'n',
    'ড়': 'o',
    'ঢ়': 'p',
    'য়': 'q',
    'ৎ': 'r',

    // Special signs & Punctuation
    'ং': 's',
    'ঃ': 't', // SutonnyMJ Visarga glyph is 't' (ASCII 116)
    'ঁ': 'u',
    '্': '&',
    'ঽ': '',
    '।': '|', // Bengali Dari -> ASCII Pipe for SutonnyMJ Dari
    '‘': "'",
    '’': "'",
    '“': '"',
    '”': '"',

    // Bengali Digits -> ASCII digits (SutonnyMJ renders ASCII 0-9 as ০-৯)
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',

    // Post-base vowel signs
    'া': 'v',
    'ী': 'x',
    'ু': 'y',
    'ূ': '~',
    'ৃ': '„'
  };

  const BANGLA_NUMBERS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const ENGLISH_NUMBERS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  // Inverse Mapping Table for Bijoy -> Unicode, sorted longest first
  const BIJOY_TO_UNICODE_CONJUNCTS = [
    { b: "Av¨v", u: "অ্যা" },
    { b: "A¨v", u: "অ্যা" },
    { b: "Av¨", u: "অ্য" },
    { b: "A¨", u: "অ্য" },
    { b: "Av", u: "আ" }, // Essential independent Aa vowel
    { b: "”P", u: "চ্চ" },
    { b: "”", u: "চ্চ" },
    { b: "Ð", u: "ণ্ড" },
    { b: "Ê", u: "ণ্ড" },
    { b: "ëª", u: "ল্ট্র" },
    { b: "ë", u: "ল্ট" },
    ...UNICODE_TO_BIJOY_CONJUNCTS
  ].sort((a, b) => b.b.length - a.b.length);

  // Single Bijoy char to Unicode
  const BIJOY_TO_UNICODE_SINGLE = {};
  for (let uKey in UNICODE_TO_BIJOY_SINGLE) {
    let bVal = UNICODE_TO_BIJOY_SINGLE[uKey];
    if (bVal && !BIJOY_TO_UNICODE_SINGLE[bVal]) {
      BIJOY_TO_UNICODE_SINGLE[bVal] = uKey;
    }
  }
  // Specific single overrides for Bijoy -> Unicode
  BIJOY_TO_UNICODE_SINGLE['t'] = 'ঃ';
  BIJOY_TO_UNICODE_SINGLE['Ý'] = 'ন্স';
  BIJOY_TO_UNICODE_SINGLE['Ð'] = 'ণ্ড';
  BIJOY_TO_UNICODE_SINGLE['Ê'] = 'ণ্ড';
  BIJOY_TO_UNICODE_SINGLE['Û'] = 'ন্ড';
  BIJOY_TO_UNICODE_SINGLE['|'] = '।';
  BIJOY_TO_UNICODE_SINGLE['`'] = 'দ';
  BIJOY_TO_UNICODE_SINGLE['_'] = 'থ';
  BIJOY_TO_UNICODE_SINGLE['a'] = 'ধ';
  BIJOY_TO_UNICODE_SINGLE['b'] = 'ন';
  BIJOY_TO_UNICODE_SINGLE['c'] = 'প';
  BIJOY_TO_UNICODE_SINGLE['d'] = 'ফ';
  BIJOY_TO_UNICODE_SINGLE['e'] = 'ব';
  BIJOY_TO_UNICODE_SINGLE['f'] = 'ভ';
  BIJOY_TO_UNICODE_SINGLE['g'] = 'ম';
  BIJOY_TO_UNICODE_SINGLE['h'] = 'য';
  BIJOY_TO_UNICODE_SINGLE['i'] = 'র';
  BIJOY_TO_UNICODE_SINGLE['j'] = 'ল';
  BIJOY_TO_UNICODE_SINGLE['k'] = 'শ';
  BIJOY_TO_UNICODE_SINGLE['l'] = 'ষ';
  BIJOY_TO_UNICODE_SINGLE['m'] = 'স';
  BIJOY_TO_UNICODE_SINGLE['n'] = 'হ';
  BIJOY_TO_UNICODE_SINGLE['o'] = 'ড়';
  BIJOY_TO_UNICODE_SINGLE['p'] = 'ঢ়';
  BIJOY_TO_UNICODE_SINGLE['q'] = 'য়';
  BIJOY_TO_UNICODE_SINGLE['r'] = 'ৎ';
  BIJOY_TO_UNICODE_SINGLE['s'] = 'ং';
  BIJOY_TO_UNICODE_SINGLE['&'] = '্';
  BIJOY_TO_UNICODE_SINGLE['v'] = 'া';
  BIJOY_TO_UNICODE_SINGLE['x'] = 'ী';
  BIJOY_TO_UNICODE_SINGLE['y'] = 'ু';
  BIJOY_TO_UNICODE_SINGLE['~'] = 'ূ';
  BIJOY_TO_UNICODE_SINGLE['„'] = 'ৃ';
  BIJOY_TO_UNICODE_SINGLE['A'] = 'অ';
  BIJOY_TO_UNICODE_SINGLE['B'] = 'ই';
  BIJOY_TO_UNICODE_SINGLE['C'] = 'ঈ';
  BIJOY_TO_UNICODE_SINGLE['D'] = 'উ';
  BIJOY_TO_UNICODE_SINGLE['E'] = 'ঊ';
  BIJOY_TO_UNICODE_SINGLE['F'] = 'ঋ';
  BIJOY_TO_UNICODE_SINGLE['G'] = 'এ';
  BIJOY_TO_UNICODE_SINGLE['H'] = 'ঐ';
  BIJOY_TO_UNICODE_SINGLE['I'] = 'ও';
  BIJOY_TO_UNICODE_SINGLE['J'] = 'ঔ';

  function isBengaliChar(char) {
    if (!char) return false;
    const code = char.charCodeAt(0);
    return (code >= 0x0980 && code <= 0x09FF) || code === 0x0964 || code === 0x0965;
  }

  function hasBengaliText(text) {
    if (!text) return false;
    for (let i = 0; i < text.length; i++) {
      if (isBengaliChar(text[i])) return true;
    }
    return false;
  }

  function isBengaliConsonant(ch) {
    if (!ch) return false;
    const c = ch.charCodeAt(0);
    return (c >= 0x0995 && c <= 0x09B9) || ch === 'ড়' || ch === 'ঢ়' || ch === 'য়' || ch === 'ৎ';
  }

  function isWordDelimiter(ch) {
    if (!ch) return true;
    return /[\s\t\n\r\.\,\;\:\!\?\"\'\(\)\[\]\{\}\<\>\-\–\—\/\\\|\u0964\u0965«»“”‘’]/.test(ch);
  }

  function unicodeToBijoy(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';

    // 0. Apply custom spelling-correction dictionary (Unicode -> Bijoy), if any.
    //    Known problem words are "pinned" to their exact dictionary Bijoy encoding so
    //    conjunct-breaking bugs can be corrected by the site admin.
    if (CUSTOM_DICT_U2B && CUSTOM_DICT_U2B.length) {
      let pinned = text;
      const placeholders = [];
      for (let di = 0; di < CUSTOM_DICT_U2B.length; di++) {
        const e = CUSTOM_DICT_U2B[di];
        if (!e || !e.unicode || !e.bijoy) continue;
        const re = new RegExp(escapeRegex(e.unicode), 'g');
        pinned = pinned.replace(re, function () {
          const ph = '\uE000' + placeholders.length.toString(36).padStart(3, '0') + '\uE001';
          placeholders.push(e.bijoy);
          return ph;
        });
      }
      if (placeholders.length) {
        let out = _unicodeToBijoyCore(pinned, options);
        out = out.replace(/\uE000([0-9a-z]{3})\uE001/g, function (m, code) {
          const n = parseInt(code, 36);
          return (placeholders[n] !== undefined) ? placeholders[n] : m;
        });
        return out;
      }
    }

    return _unicodeToBijoyCore(text, options);
  }

  function sanitizeMathBengaliSeparation(rawText) {
    if (!rawText || typeof rawText !== 'string') return rawText || '';
    let s = rawText;

    // 1. Strip \text{...}, \mathrm{...} wrappers around Bengali text
    s = s.replace(/\\text(?:rm|md|bf|it)?\{\s*([^{}]*?[\u0980-\u09FF][^{}]*?)\s*\}/g, '$1');

    // 2. Scan each math block: $...$, $$...$$, \[...\], \(...\)
    s = s.replace(/\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, (match, d1, s1, b1, p1) => {
      const isDouble = Boolean(d1 || b1);
      const inner = d1 || s1 || b1 || p1 || '';
      
      if (!/[\u0980-\u09FF]/.test(inner)) {
        return match;
      }

      // Split math tokens vs Bengali text tokens
      const tokenRegex = /([^\u0980-\u09FF"'”’]+)|(["'”’]*[\u0980-\u09FF]+(?:[\s\-_/]+[\u0980-\u09FF]+)*["'”’]*)/g;
      let parts = [];
      let m;
      while ((m = tokenRegex.exec(inner)) !== null) {
        if (m[1]) {
          const mathChunk = m[1].trim();
          if (mathChunk) {
            parts.push(isDouble ? `$$${mathChunk}$$` : `$${mathChunk}$`);
          }
        } else if (m[2]) {
          const bnChunk = m[2].trim();
          if (bnChunk) {
            parts.push(bnChunk);
          }
        }
      }

      return parts.join(' ');
    });

    // 3. Clean up empty math blocks
    s = s.replace(/\$\$\s*\$\$/g, '').replace(/\$\s*\$/g, '');
    return s;
  }

  function _unicodeToBijoyCore(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';

    // First sanitize and extract any Bengali words/units out of LaTeX math blocks
    let str = sanitizeMathBengaliSeparation(text);

    // If text contains LaTeX math blocks ($...$, $$...$$, \[...\], \(...\)), preserve math commands!
    const mathRegex = /\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/;
    if (mathRegex.test(str)) {
      const parts = [];
      const regex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(str)) !== null) {
        if (match.index > lastIndex) {
          parts.push(_convertUnicodeToBijoyRaw(str.substring(lastIndex, match.index), options));
        }

        const mathInner = match[1] || match[2] || match[3] || match[4] || "";
        // Convert any leftover Bengali text inside \text{...} to Bijoy
        let convertedMathInner = mathInner.replace(/\\(?:text|mathrm|textmd|textbf|textit)\{([^{}]+)\}/g, (m, inner) => {
          return `\\text{${_convertUnicodeToBijoyRaw(inner, options)}}`;
        });
        // Convert LaTeX non-breaking space (~) and \sim to space
        convertedMathInner = convertedMathInner.replace(/~/g, ' ').replace(/\\sim\b/g, ' ');
        parts.push(`$${convertedMathInner}$`);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < str.length) {
        parts.push(_convertUnicodeToBijoyRaw(str.substring(lastIndex), options));
      }

      return parts.join('');
    }

    return _convertUnicodeToBijoyRaw(str, options);
  }

  function _convertUnicodeToBijoyRaw(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';

    // Normalize curly quotes & punctuation & dashes
    let str = text;
    str = str.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[\u2014\u2013\u2212\u2012\u2015]/g, '-');

    if (!hasBengaliText(str)) {
      let out = str;
      out = out.replace(/[\u09E6-\u09EF]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x09E6 + 0x30));
      out = out.replace(/\u0964/g, '|').replace(/\u0965/g, '||').replace(/[\u2014\u2013\u2212\u2012\u2015]/g, '-');
      return out;
    }

    // 1. Normalize Decomposed characters & Nuktas
    str = str.replace(/ড\u09BC/g, 'ড়').replace(/ঢ\u09BC/g, 'ঢ়').replace(/য\u09BC/g, 'য়').replace(/র\u09BC/g, 'ড়');
    str = str.replace(/\u09C7\u09BE/g, 'ো'); // e-kar + aa-kar -> o-kar
    str = str.replace(/\u09C7\u09D7/g, 'ৌ'); // e-kar + length -> ou-kar
    str = str.replace(/\u200D/g, '').replace(/\u200C/g, ''); // Remove ZWJ / ZWNJ
    // Auto-repair corrupt artifact characters (e.g. leftover Bijoy Ý -> ন্স, and corrupt ণ্ড glyphs)
    str = str.replace(/Ý/g, 'ন্স');
    str = str.replace(/কু[˜~¯\^]লী/g, 'কুণ্ডলী');
    str = str.replace(/কু[˜~¯\^]লীতে/g, 'কুণ্ডলীতে');
    str = str.replace(/কু[˜~¯\^]লীর/g, 'কুণ্ডলীর');
    str = str.replace(/কু[˜~¯\^]ল/g, 'কুণ্ডল');
    str = str.replace(/([কখগঘচছজঝটঠডঢণতথদধনপফবভমযরলশষসহ])ু[˜~¯\^]ল/g, '$1ুণ্ডল');

    let result = "";
    let i = 0;
    const len = str.length;

    while (i < len) {
      if (!isBengaliChar(str[i])) {
        result += str[i];
        i++;
        continue;
      }

      // Check if current syllable is at the BEGINNING of a word
      const syllableStartIndex = i;
      let isWordStart = (syllableStartIndex === 0) || isWordDelimiter(str[syllableStartIndex - 1]);

      // Check for Ref: 'র' + '্' followed by a consonant
      let hasRef = false;
      if (str[i] === 'র' && i + 1 < len && str[i + 1] === '্' && i + 2 < len && isBengaliConsonant(str[i + 2])) {
        hasRef = true;
        i += 2; // Skip 'র' + '্'
      }

      // Extract Consonant / Conjunct Cluster
      let clusterInfo = extractCluster(str, i);
      let clusterUnicode = clusterInfo.cluster;
      i = clusterInfo.nextIndex;

      // Extract Vowel Signs & Modifiers
      // Word-Initial: '†' (\u2020 / Alt 0134 - Un-matraed)
      // Inside Word: '‡' (\u2021 / Alt 0135 - Matra-attached)
      const eKarGlyph = isWordStart ? '†' : '‡';

      let preVowel = "";   // 'w' (ি), '†'/'‡' (ে), 'ˆ' (ৈ)
      let postVowel = "";  // 'v' (া), 'x' (ী), 'y' (ু), '~' (ূ), '„' (ৃ), 'Š' (ৌ)
      let hasChandra = false;

      while (i < len) {
        let ch = str[i];
        if (ch === 'ি') {
          preVowel = 'w';
          i++;
        } else if (ch === 'ে') {
          preVowel = eKarGlyph;
          i++;
        } else if (ch === 'ৈ') {
          preVowel = 'ˆ'; // SutonnyMJ Oi-Kar (\u02C6)
          i++;
        } else if (ch === 'ো') {
          preVowel = eKarGlyph;
          postVowel = 'v';
          i++;
        } else if (ch === 'ৌ') {
          preVowel = eKarGlyph;
          postVowel = 'Š';
          i++;
        } else if (ch === 'া') {
          postVowel = 'v';
          i++;
        } else if (ch === 'ী') {
          postVowel = 'x';
          i++;
        } else if (ch === 'ু') {
          postVowel = 'y';
          i++;
        } else if (ch === 'ূ') {
          postVowel = '~';
          i++;
        } else if (ch === 'ৃ') {
          postVowel = '„';
          i++;
        } else if (ch === 'ঁ') {
          hasChandra = true;
          i++;
        } else {
          break;
        }
      }

      // Map cluster to Bijoy
      let bijoyCluster = mapCluster(clusterUnicode);

      // Special postVowel ligatures
      if (clusterUnicode === 'ক' && postVowel === 'y') { bijoyCluster = 'Kz'; postVowel = ''; }
      else if (clusterUnicode === 'গ' && postVowel === 'y') { bijoyCluster = 'My'; postVowel = ''; }
      else if (clusterUnicode === 'র' && postVowel === 'y') { bijoyCluster = 'iæ'; postVowel = ''; }
      else if (clusterUnicode === 'র' && postVowel === '~') { bijoyCluster = 'iƒ'; postVowel = ''; }
      else if (clusterUnicode === 'শ' && postVowel === 'y') { bijoyCluster = 'ï'; postVowel = ''; }
      else if (clusterUnicode === 'হ' && postVowel === 'y') { bijoyCluster = 'û'; postVowel = ''; }
      else if (clusterUnicode === 'হ' && postVowel === '~') { bijoyCluster = 'n~'; postVowel = ''; }
      else if (clusterUnicode === 'হ' && postVowel === '„') { bijoyCluster = 'ü'; postVowel = ''; }
      else if (clusterUnicode === 'ন্দ' && postVowel === 'y') { bijoyCluster = '›`'; postVowel = 'y'; }
      else if (clusterUnicode === 'ন্দ' && postVowel === '~') { bijoyCluster = '›`'; postVowel = '~'; }

      // Construct Bijoy token:
      let unit = "";
      if (preVowel) unit += preVowel;
      unit += bijoyCluster;
      if (postVowel) unit += postVowel;
      if (hasRef) unit += '©';
      if (hasChandra) unit += 'u';

      result += unit;
    }

    return result;
  }

  function extractCluster(str, startIndex) {
    let i = startIndex;
    let cluster = "";

    // Check multi-character conjuncts first (including অ্যা and অ্য)
    for (let item of UNICODE_TO_BIJOY_CONJUNCTS) {
      if (str.startsWith(item.u, i)) {
        return { cluster: item.u, nextIndex: i + item.u.length };
      }
    }

    const first = str[i];
    if (UNICODE_TO_BIJOY_SINGLE[first] && !isBengaliConsonant(first)) {
      return { cluster: first, nextIndex: i + 1 };
    }

    while (i < str.length) {
      let ch = str[i];
      if (isBengaliConsonant(ch)) {
        cluster += ch;
        i++;
        if (i < str.length && str[i] === '্') {
          if (i + 1 < str.length && (isBengaliConsonant(str[i + 1]) || str[i + 1] === 'য' || str[i + 1] === 'র' || str[i + 1] === 'ব')) {
            cluster += '্';
            i++;
            continue;
          } else {
            cluster += '্';
            i++;
            break;
          }
        } else {
          break;
        }
      } else if (ch >= '০' && ch <= '৯') {
        cluster = ch;
        i++;
        break;
      } else if (ch === 'ং' || ch === 'ঃ' || ch === 'ঁ' || ch === '।' || ch === 'ৎ' || ch === '\u0964') {
        cluster = ch;
        i++;
        break;
      } else {
        break;
      }
    }

    if (!cluster && startIndex < str.length) {
      cluster = str[startIndex];
      i = startIndex + 1;
    }

    return { cluster, nextIndex: i };
  }

  function mapCluster(cluster) {
    if (!cluster) return '';

    for (let item of UNICODE_TO_BIJOY_CONJUNCTS) {
      if (cluster === item.u) return item.b;
    }

    if (UNICODE_TO_BIJOY_SINGLE[cluster]) {
      return UNICODE_TO_BIJOY_SINGLE[cluster];
    }

    let parts = cluster.split('্');
    if (parts.length > 1) {
      let out = "";
      for (let p = 0; p < parts.length; p++) {
        let partChar = parts[p];
        let bijoyChar = UNICODE_TO_BIJOY_SINGLE[partChar] || partChar;
        if (p === 0) {
          out += bijoyChar;
        } else {
          if (partChar === 'য') out += '¨';
          else if (partChar === 'র') out += 'ª';
          else if (partChar === 'ব') out += '¡';
          else out += '&' + bijoyChar;
        }
      }
      return out;
    }

    let res = "";
    for (let c of cluster) {
      res += UNICODE_TO_BIJOY_SINGLE[c] || c;
    }
    return res;
  }

  function convertDigits(text, format) {
    if (!text) return text;
    if (format === 'bengali') {
      for (let d = 0; d < 10; d++) {
        text = text.replaceAll(ENGLISH_NUMBERS[d], BANGLA_NUMBERS[d]);
      }
    } else if (format === 'english') {
      for (let d = 0; d < 10; d++) {
        text = text.replaceAll(BANGLA_NUMBERS[d], ENGLISH_NUMBERS[d]);
      }
    }
    return text;
  }

  // Recognized English patterns in Bijoy documents to prevent corrupting genuine English words into Bijoy glyphs
  // Strictly matches URLs, emails, uppercase acronyms, or distinct multi-word English terms and isolated/trailing dashes
  const BIJOY_ENGLISH_TOKEN_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\b(?:UNO|DC|ADC|SP|ASP|AC|NID|SSC|HSC|JSC|PSC|BSc|MSc|BA|MA|BBA|MBA|MBBS|BEd|BCS|ICT|PDF|DOC|DOCX|XLS|XLSX|PPT|PPTX|SMS|OTP|PIN|GPA|CGPA|URL|HTTP|HTTPS|WWW|COM|BD|ORG|GOV|CDAP|NGO|USA|UK|UN|WHO|UNDP|UNICEF|BBS|BRAC|BUET|DU|RU|CU|KU|SUST|BAPEX|WASA|DESCO|DPDC|NESCO|BREB|PDB|BPDB|BTRC|BRTC|BIWTA|RTHD|LGD|LGED|PWD|RHD|BWDB|BEPZA|BIDA|EPZ|NBR|ACC|DUDOK|RAB|BGB|DGFI|NSI|CID|DB|SB|PBI|IEEE|ISO|AI|ML)\b|\b(?:Email|Phone|Mobile|Tel|Fax|Web|Website|Name|Date|Roll|Reg|Section|Class|Room|Total|Page|Mark|Marks|Pass|Fail|Grade|Subject|Code|Bangla|English|Math|Physics|Chemistry|Biology|Exam|Test|Week|Month|Year|Notice|Official|Department|Ministry|Office|Officer|Director|Manager|Chairman|Secretary|Principal|Teacher|Teachers|Student|Students|Father|Mother|Village|Post|Thana|Upazila|District|Division|Bangladesh|Community|Development|Action|Plan|Study|Project|Report|Summary|Activity|Activities|Responsible|Stakeholders|Resources|Needed|Timeline|Meeting|Awareness|Addiction|Classes|During|Introduce|Sports|Cultural|Support|Group|Organize|Workshop|Setting|Rules|Launch|Reward|System|Reduce|Involve|Clinic|Counseling|Approximate)\b(?::|\b)|[-–—−‒―]|\s*[-–—−‒―]\s*)/g;

  /**
   * Token-Based Robust Bijoy (SutonnyMJ) to Unicode Converter
   */
  function bijoyToUnicode(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';

    // Auto-repair corrupt artifact characters (e.g. leftover Bijoy Ý -> ন্স, and corrupt ণ্ড glyphs)
    text = text.replace(/Ý/g, 'ন্স');
    text = text.replace(/কু[˜~¯\^]লী/g, 'কুণ্ডলী');
    text = text.replace(/কু[˜~¯\^]লীতে/g, 'কুণ্ডলীতে');
    text = text.replace(/কু[˜~¯\^]লীর/g, 'কুণ্ডলীর');
    text = text.replace(/কু[˜~¯\^]ল/g, 'কুণ্ডল');
    text = text.replace(/([কখগঘচছজঝটঠডঢণতথদধনপফবভমযরলশষসহ])ু[˜~¯\^]ল/g, '$1ুণ্ডল');

    if (options.isSegment) {
      return _internalBijoyToUnicode(text, options);
    }

    // Preserve LaTeX math blocks ($...$, $$...$$, \[...\], \(...\)) so math is never corrupted into Bijoy glyphs!
    const mathRegex = /\$\$[\s\S]*?\$\$|\$[^\$]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/;
    if (mathRegex.test(text)) {
      const parts = [];
      const regex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push(bijoyToUnicode(text.substring(lastIndex, match.index), { ...options, isSegment: true }));
        }

        const mathInner = match[1] || match[2] || match[3] || match[4] || "";
        // Convert any Bengali text inside \text{...} to Unicode
        let convertedMathInner = mathInner.replace(/\\(?:text|mathrm|textmd|textbf|textit)\{([^{}]+)\}/g, (m, inner) => {
          return `\\text{${_internalBijoyToUnicode(inner, options)}}`;
        });
        // Convert LaTeX non-breaking space (~) and \sim to space
        convertedMathInner = convertedMathInner.replace(/~/g, ' ').replace(/\\sim\b/g, ' ');
        parts.push(`$${convertedMathInner}$`);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        parts.push(bijoyToUnicode(text.substring(lastIndex), { ...options, isSegment: true }));
      }

      return parts.join('');
    }

    // Tokenize text into recognized English tokens vs Bijoy chunks
    const tokens = [];
    let lastIndex = 0;
    BIJOY_ENGLISH_TOKEN_REGEX.lastIndex = 0;
    let match;

    while ((match = BIJOY_ENGLISH_TOKEN_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'bijoy', text: text.slice(lastIndex, match.index) });
      }
      tokens.push({ type: 'english', text: match[0] });
      lastIndex = BIJOY_ENGLISH_TOKEN_REGEX.lastIndex;
    }
    if (lastIndex < text.length) {
      tokens.push({ type: 'bijoy', text: text.slice(lastIndex) });
    }

    if (tokens.length > 0) {
      return tokens.map(tok => {
        if (tok.type === 'english') {
          return options.convertNumbers ? convertDigits(tok.text, options.numberFormat) : tok.text;
        }
        if (hasBengaliText(tok.text)) {
          return _convertMixedChunk(tok.text, options);
        }
        return _internalBijoyToUnicode(tok.text, { ...options, isSegment: true });
      }).join('');
    }

    if (hasBengaliText(text)) {
      return _convertMixedChunk(text, options);
    }

    return _internalBijoyToUnicode(text, options);
  }

  function _convertMixedChunk(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';

    // Split into blocks of Unicode Bengali vs blocks of Bijoy ASCII
    const regex = /([\u0980-\u09FF\s\u0964\u0965\d\.\,\-\:\;\(\)\/\+\=\*\?\!\@\#\$\%\^\&\|]+)|([^\u0980-\u09FF]+)/g;
    let match;
    const parts = [];

    while ((match = regex.exec(text)) !== null) {
      const m = match[0];
      if (!m) continue;
      if (hasBengaliText(m)) {
        parts.push(options.convertNumbers ? convertDigits(m, options.numberFormat) : m);
      } else {
        parts.push(_internalBijoyToUnicode(m, { ...options, isSegment: true }));
      }
    }

    return parts.join('');
  }

  function _internalBijoyToUnicode(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';

    let str = text;
    let result = "";
    let i = 0;
    const len = str.length;

    while (i < len) {
      // 1. Check for Pre-vowels
      let preVowel = "";
      let ch = str[i];

      if (ch === 'w') {
        preVowel = 'ি';
        i++;
      } else if (ch === '†' || ch === '‡') {
        preVowel = 'ে';
        i++;
      } else if (ch === 'ˆ' || ch === '‰') {
        preVowel = 'ৈ';
        i++;
      }

      if (i >= len) {
        if (preVowel) result += preVowel;
        break;
      }

      // 2. Extract Cluster / Glyph
      let matchedClusterUnicode = "";
      let matchedLen = 0;

      // Check multi-character conjuncts first
      for (let item of BIJOY_TO_UNICODE_CONJUNCTS) {
        if (str.startsWith(item.b, i)) {
          matchedClusterUnicode = item.u;
          matchedLen = item.b.length;
          break;
        }
      }

      // Check single char mapping
      if (!matchedClusterUnicode && BIJOY_TO_UNICODE_SINGLE[str[i]]) {
        matchedClusterUnicode = BIJOY_TO_UNICODE_SINGLE[str[i]];
        matchedLen = 1;
      }

      if (!matchedClusterUnicode) {
        // Unmapped ASCII character (numbers, punctuation, symbols, whitespace)
        if (preVowel) {
          result += preVowel;
          preVowel = "";
        }
        result += str[i];
        i++;
        continue;
      }

      i += matchedLen;

      // 3. Post-cluster modifiers: Post-vowels, Ref (©), Chandrabindu (u)
      let postVowel = "";
      let hasRef = false;
      let hasChandra = false;
      const isIndependentVowel = /^[অআইঈউঊঋএঐওঔ]/.test(matchedClusterUnicode);

      while (i < len) {
        let nextCh = str[i];
        if (nextCh === '©') {
          hasRef = true;
          i++;
        } else if (nextCh === 'u') {
          hasChandra = true;
          i++;
        } else if (!isIndependentVowel && nextCh === 'v') {
          postVowel = 'া';
          i++;
        } else if (!isIndependentVowel && nextCh === 'x') {
          postVowel = 'ী';
          i++;
        } else if (!isIndependentVowel && (nextCh === 'y' || nextCh === 'z')) {
          postVowel = 'ু';
          i++;
        } else if (!isIndependentVowel && nextCh === '~') {
          postVowel = 'ূ';
          i++;
        } else if (!isIndependentVowel && (nextCh === '„' || nextCh === '…')) {
          postVowel = 'ৃ';
          i++;
        } else if (!isIndependentVowel && nextCh === 'Š') {
          postVowel = 'ৌ';
          i++;
        } else {
          break;
        }
      }

      // Check for composite o-kar / ou-kar
      let finalVowel = "";
      if (preVowel === 'ে' && postVowel === 'া') {
        finalVowel = 'ো';
      } else if (preVowel === 'ে' && postVowel === 'ৌ') {
        finalVowel = 'ৌ';
      } else {
        finalVowel = preVowel + postVowel;
      }

      // Construct Unicode Token: [Ref (র্)] + [Cluster] + [Vowel] + [Chandrabindu (ঁ)]
      let unit = "";
      if (hasRef) unit += 'র্';
      unit += matchedClusterUnicode;
      if (finalVowel) unit += finalVowel;
      if (hasChandra) unit += 'ঁ';

      result += unit;
    }

    if (options.convertNumbers) {
      result = convertDigits(result, options.numberFormat);
    }

    return result;
  }

  function isBijoyText(text, fontName = '') {
    // Support either order (text, fontName) or (fontName, text)
    if (typeof text !== 'string' && typeof fontName === 'string') {
      const temp = text; text = fontName; fontName = temp || '';
    }
    if (!text || typeof text !== 'string') return false;
    // 1. Explicit Sutonny/Bijoy font name check
    if (fontName && /sutonny|bijoy|sutony|matra|boishakhi|chandan|probhat|bandhan|doshomik/i.test(fontName)) return true;

    // 2. If it contains Unicode Bengali characters, it's not Bijoy
    if (hasBengaliText(text)) return false;

    // 3. Characteristic Bijoy vowel signs, digits, and conjunct symbols that NEVER appear in standard English prose:
    const hasBijoyVowelOrSign = /[†‡©ª¯µ¸¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿ‰Š‹ŒŽ˜™š›œžŸ`~^|]/.test(text);
    if (hasBijoyVowelOrSign) {
      return true;
    }

    // 4. Characteristic Bijoy consonant + kar combinations (e.g. wK, wL, wM, w`b, cÖ, eø, e¨, K¨, MÖ, †K, ‡K):
    if (/(?:w[K-Z_`a-z]|cÖ|eø|e¨|K¨|MÖ|†[K-Z_`a-z]|‡[K-Z_`a-z]|¯‹|¯Í|šÍ|›`)/.test(text)) {
      return true;
    }

    return false;
  }

  function isPureEnglish(text, fontName = '') {
    if (!text || typeof text !== 'string') return true;
    if (hasBengaliText(text)) return false;
    if (fontName && /sutonny|bijoy/i.test(fontName)) return false;
    if (isBijoyText(text, fontName)) return false;

    // Explicit English fonts
    if (fontName && /times new roman|calibri|arial|cambria|georgia|verdana|tahoma|segoe|consolas|courier|helvetica/i.test(fontName)) {
      return true;
    }

    // Acronyms (DC, UNO, CDAP, etc.) or URLs / Emails
    if (BIJOY_ENGLISH_TOKEN_REGEX.test(text)) return true;

    // Match standard English words
    if (/\b(?:Dear|Sir|Please|Take|Necessary|Steps|Action|Signature|Dinajpur|Activity|Activities|Survey|Student|Students|Teacher|Teachers|Parent|Parents|School|Hold|Meeting|Explain|Problem|Start|Awareness|Classes|Effects|Phone|Addiction|Hours|During|Introduce|Sports|Cultural|Train|Spot|Signs|Peer|Support|Group|Among|Organize|Workshop|Setting|Rules|Home|Launch|Reward|System|Reduce|Involve|Clinic|Counseling|Responsible|Stakeholders|Resources|Needed|Timeline|Month|Year|Date|Name|Total|Page|Section|Class|Room|Mark|Marks|Pass|Fail|Grade|Subject|Report|Summary|Community|Development|Action|Plan|Study|Project|Approximate)\b/i.test(text)) {
      return true;
    }

    // Pure Latin / English letters, numbers, and math symbols
    if (!fontName && /^[A-Za-z0-9\s.,;:!?()\[\]{}'"\/\\+\-*=<>±×÷≠≤≥≈∞→⇒←⇄↔√∫∑°\^─–—−‒#%&@$_]+$/.test(text)) {
      return true;
    }

    return false;
  }

  function convertToAllBijoy(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';
    if (hasBengaliText(text)) {
      return unicodeToBijoy(text, options);
    }
    return text;
  }

  function convertToAllUnicode(text, options = {}) {
    if (!text || typeof text !== 'string') return text || '';
    if (hasBengaliText(text) && !isBijoyText(text)) {
      return text;
    }
    if (isBijoyText(text) || !hasBengaliText(text)) {
      return bijoyToUnicode(text, options);
    }
    return text;
  }

  /**
   * Splits a Unicode string with mixed Bengali and English into distinct segments.
   * Isolates genuine English words/abbreviations/emails/codes from Bengali words.
   * Never splits pure Bengali sentences into spurious English segments.
   * @param {string} text
   * @returns {Array<{type: 'bengali'|'english', text: string}>}
   */
  function splitMixedBengaliAndEnglish(text) {
    if (!text || typeof text !== 'string') return [];
    
    // Check if pure English
    if (isPureEnglish(text)) {
      return [{ type: 'english', text: text }];
    }
    // Check if has no Latin letters, no ASCII English digits, no Greek / Math symbols, and no dashes
    if (!/[A-Za-z0-9\u0370-\u03FF\u1F00-\u1FFF]/.test(text) && 
        !/[+\-*\/=<>±×÷≠≤≥≈∞→⇒←⇄↔√∫∑°\^─]/.test(text) &&
        !/[-–—−‒―]/.test(text)) {
      return [{ type: 'bengali', text: text }];
    }

    const segments = [];
    let leadingNeutral = "";
    // Tokenizer matching Bengali vs English/Math/Greek/Symbols/Dashes/Arrows
    const tokenRegex = /([\u0980-\u09FF\u0964\u0965]+)|([A-Za-z0-9\u0370-\u03FF\u1F00-\u1FFF\\_+\-*\/=<>±×÷≠≤≥≈∞→⇒←⇄↔√∫∑°\^\$\#\%\&\~\(\)\[\]\{\}\u2013\u2014\u2212\u2012\u2015─-]+)|([^\s\u0980-\u09FFA-Za-z0-9\u0370-\u03FF\u2013\u2014\u2212\u2012\u2015─-]+|\s+)/g;
    
    let match;
    while ((match = tokenRegex.exec(text)) !== null) {
      const bnMatch = match[1];
      const enMatch = match[2];
      const neutralMatch = match[3];

      if (bnMatch) {
        if (leadingNeutral) {
          segments.push({ type: 'bengali', text: leadingNeutral + bnMatch });
          leadingNeutral = "";
        } else {
          segments.push({ type: 'bengali', text: bnMatch });
        }
      } else if (enMatch) {
        if (leadingNeutral) {
          segments.push({ type: 'english', text: leadingNeutral + enMatch });
          leadingNeutral = "";
        } else {
          segments.push({ type: 'english', text: enMatch });
        }
      } else if (neutralMatch) {
        if (/[-–—−‒―]/.test(neutralMatch)) {
          segments.push({ type: 'english', text: neutralMatch });
        } else if (segments.length > 0) {
          segments[segments.length - 1].text += neutralMatch;
        } else {
          leadingNeutral += neutralMatch;
        }
      }
    }
    if (leadingNeutral) {
      segments.push({ type: 'bengali', text: leadingNeutral });
    }

    const merged = [];
    for (let k = 0; k < segments.length; k++) {
      const s = segments[k];
      if (!s.text) continue;
      if (merged.length > 0 && merged[merged.length - 1].type === s.type) {
        merged[merged.length - 1].text += s.text;
      } else {
        merged.push({ type: s.type, text: s.text });
      }
    }

    return merged.length > 0 ? merged : [{ type: 'bengali', text: text }];
  }
  /**
   * Splits a Bijoy (SutonnyMJ) string into distinct Bijoy Bengali and English segments.
   * @param {string} text
   * @returns {Array<{type: 'bengali'|'english', text: string}>}
   */
  function splitBijoyAndEnglish(text) {
    if (!text || typeof text !== 'string') return [];

    const tokens = [];
    let lastIndex = 0;
    BIJOY_ENGLISH_TOKEN_REGEX.lastIndex = 0;
    let match;

    while ((match = BIJOY_ENGLISH_TOKEN_REGEX.exec(text)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({ type: 'bengali', text: text.slice(lastIndex, match.index) });
      }
      tokens.push({ type: 'english', text: match[0] });
      lastIndex = BIJOY_ENGLISH_TOKEN_REGEX.lastIndex;
    }
    if (lastIndex < text.length) {
      tokens.push({ type: 'bengali', text: text.slice(lastIndex) });
    }

    if (tokens.length === 0) {
      return [{ type: 'bengali', text: text }];
    }

    return tokens;
  }

  const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const ENGLISH_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

  function convertDigits(text, targetFormat = 'bangla') {
    if (!text || typeof text !== 'string') return text || '';
    if (targetFormat === 'keep') return text;

    let res = text;
    if (targetFormat === 'bangla' || targetFormat === 'bn') {
      for (let d = 0; d < 10; d++) {
        res = res.replaceAll(ENGLISH_DIGITS[d], BENGALI_DIGITS[d]);
      }
    } else if (targetFormat === 'english' || targetFormat === 'en') {
      for (let d = 0; d < 10; d++) {
        res = res.replaceAll(BENGALI_DIGITS[d], ENGLISH_DIGITS[d]);
      }
    }
    return res;
  }

  function autoConvert(text, options = {}) {
    if (!text) return text;
    if (hasBengaliText(text)) {
      return unicodeToBijoy(text, options);
    } else {
      return bijoyToUnicode(text, options);
    }
  }

  function setCustomDictionary(list) {
    if (!Array.isArray(list)) list = [];
    CUSTOM_DICT_U2B = list.filter(e => e && e.unicode && e.bijoy);
  }

  function getCustomDictionary() {
    return CUSTOM_DICT_U2B.slice();
  }

  function formatQuestionPaper(text, isBijoy = false) {
    if (!text) return text;
    if (typeof DocxHandler !== 'undefined' && typeof DocxHandler.formatQuestionPaper === 'function') {
      return DocxHandler.formatQuestionPaper(text, isBijoy);
    }
    return text;
  }

  const BanglaConverter = {
    unicodeToBijoy,
    bijoyToUnicode,
    convertToAllBijoy,
    convertToAllUnicode,
    autoConvert,
    hasBengaliText,
    isBengaliChar,
    isBijoyText,
    isPureEnglish,
    splitMixedBengaliAndEnglish,
    splitBijoyAndEnglish,
    convertDigits,
    setCustomDictionary,
    getCustomDictionary,
    formatQuestionPaper
  };

  if (typeof window !== 'undefined') {
    window.BanglaConverter = BanglaConverter;
  }
  if (typeof global !== 'undefined') {
    global.BanglaConverter = BanglaConverter;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BanglaConverter;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
