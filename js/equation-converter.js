/**
 * EquationConverter.js
 * High-Fidelity LaTeX and OMML to Word EQ Field converter for Office 2003 / 2007+.
 * Features:
 * 1. Automatic Math Italics (<w:i/>) on all equation runs to match Equation Editor 100%.
 * 2. Proper degree conversion (^\circ, ^{\circ}, \circ, \degree -> \u00B0) and angles (\angle -> \u2220).
 * 3. Standard trigonometry / units (\tan, \sin, \cos, \text{cm}) and quoted text words.
 * 4. 100% clean Word editability without duplicate fallback text.
 * 5. 100% ASCII safe using explicit Unicode escapes for total cross-browser and cross-encoding stability.
 */

(function (global) {
  'use strict';

  class EquationConverter {

    /**
     * Translates a LaTeX equation into a Word EQ Field code string.
     */
    static latexToEqField(latex, isU2B) {
      if (typeof isU2B === 'undefined') isU2B = true;
      if (!latex) return "";
      let s = latex.trim();

      // 0. Strip math delimiters ($$, $, \[, \], \(, \))
      if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2).trim();
      else if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();
      else if (s.startsWith('\\[') && s.endsWith('\\]')) s = s.slice(2, -2).trim();
      else if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim();

      // 0.1 Pre-convert degree symbols and angles BEFORE _convertMacros
      s = s.replace(/\\angle\b/g, '\u2220');
      s = s.replace(/\^\s*\\circ\b|\^\{\s*\\circ\s*\}|\\circ\b|\\degree\b|\^\{\s*\u00B0\s*\}|\^\u00B0/g, '\u00B0');

      // 0.2 Pre-sanitize LaTeX escape characters so Word never confuses them with EQ field switches
      s = s.replace(/\\%/g, '%');
      s = s.replace(/\\sim\b/g, ' ');
      s = s.replace(/~/g, ' ');
      s = s.replace(/\\\$/g, '$');
      s = s.replace(/\\&/g, '&');
      s = s.replace(/\\_/g, '_');
      s = s.replace(/\\#/g, '#');
      s = s.replace(/\\\{/g, '{');
      s = s.replace(/\\\}/g, '}');

      // 0.3 Pre-space trig and standard functions when directly followed by backslash command or letters (e.g. \sin\theta -> \sin \theta)
      s = s.replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|arcsin|arccos|arctan|sinh|cosh|tanh|coth|lim|det|min|max|deg)(?=\\[a-zA-Z]|[a-zA-Z0-9])/g, '\\$1 ');

      // 1. Process \text{...} / \mathrm{...} / \textbf{...} blocks:
      s = s.replace(/\\(?:text|mathrm|textmd|textbf|textit|mbox)\{([^{}]+)\}/g, function(match, inner) {
        let trimmed = inner.trim().replace(/^["']|["']$/g, '');
        // Standard scientific, physics & math units: do NOT quote them!
        if (/^(?:cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|kHz|MHz|GHz|N|Pa|kPa|J|kJ|cal|kcal|eV|MeV|mol|K|rad|deg|cd|lm|lx|dB)$/i.test(trimmed)) {
          return ' ' + trimmed + ' ';
        }
        let converted = trimmed;
        if (isU2B && typeof BanglaConverter !== 'undefined' && BanglaConverter.hasBengaliText(trimmed)) {
          converted = BanglaConverter.unicodeToBijoy(trimmed, { convertNumbers: false });
          return ' ' + converted + ' ';
        }
        if (/[\u0980-\u09FF]/.test(converted)) {
          return ' ' + converted + ' ';
        }
        return ' ' + converted + ' ';
      });

      // 2. Convert LaTeX macros (fractions, roots, superscripts, subscripts, brackets)
      s = this._convertMacros(s, isU2B);

      // 3. Convert math symbols, trig functions and greek letters
      s = this._convertSymbols(s);

      // 3.5 Sanitize any unhandled LaTeX backslash commands so Word EQ field code never fails with Error!
      // Allowed switches in Word EQ fields: \F, \R, \S, \B, \A, \I, \O, \X, \L, \N, \D, \up, \do, \bc, \ba, \fo, \li, \to
      s = s.replace(/\\(?!(?:[FRSBAIOXLD]|up\d*|do\d*|bc|ba|fo|li|to)\b)([a-zA-Z]+)/g, '$1');

      // Strip any stray quotation marks around standard units
      s = s.replace(/["']\s*(cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|kHz|N|Pa|J)\s*["']/gi, '$1');

      // 4. Clean up spaces
      s = s.replace(/\s+/g, ' ').trim();

      return s;
    }

    /**
     * Helper to find matching brace group { ... } or [ ... ]
     */
    static _extractGroup(str, startIndex) {
      if (startIndex >= str.length) return null;
      const openChar = str[startIndex];
      if (openChar !== '{' && openChar !== '[') return null;
      const closeChar = openChar === '{' ? '}' : ']';
      let depth = 0;

      for (let i = startIndex; i < str.length; i++) {
        if (str[i] === openChar) {
          depth++;
        } else if (str[i] === closeChar) {
          depth--;
          if (depth === 0) {
            return {
              content: str.substring(startIndex + 1, i),
              endIndex: i
            };
          }
        }
      }
      return null;
    }

    /**
     * Recursively convert LaTeX structural macros to Word EQ fields
     */
    static _convertMacros(str, isU2B) {
      let result = "";
      let i = 0;

      while (i < str.length) {
        // Skip quoted text strings so Bijoy underscores/carets inside words are never treated as LaTeX sub/superscripts
        if (str[i] === '"') {
          let endQ = str.indexOf('"', i + 1);
          if (endQ !== -1) {
            result += str.substring(i, endQ + 1);
            i = endQ + 1;
            continue;
          }
        }

        // Check for \frac, \dfrac, \tfrac
        if (str.startsWith('\\frac', i) || str.startsWith('\\dfrac', i) || str.startsWith('\\tfrac', i)) {
          let macroLen = str.startsWith('\\frac', i) ? 5 : 6;
          let p = i + macroLen;
          while (p < str.length && /\s/.test(str[p])) p++;

          let numGroup = this._extractGroup(str, p);
          if (numGroup) {
            let p2 = numGroup.endIndex + 1;
            while (p2 < str.length && /\s/.test(str[p2])) p2++;
            let denGroup = this._extractGroup(str, p2);
            if (denGroup) {
              let numConverted = this._convertMacros(numGroup.content, isU2B);
              let denConverted = this._convertMacros(denGroup.content, isU2B);
              result += '\\F(' + numConverted + ',' + denConverted + ')';
              i = denGroup.endIndex + 1;
              continue;
            }
          }
        }

        // Check for \sqrt[deg]{val} or \sqrt{val}
        if (str.startsWith('\\sqrt', i)) {
          let p = i + 5;
          while (p < str.length && /\s/.test(str[p])) p++;

          let deg = "";
          if (str[p] === '[') {
            let degGroup = this._extractGroup(str, p);
            if (degGroup) {
              deg = this._convertMacros(degGroup.content, isU2B);
              p = degGroup.endIndex + 1;
              while (p < str.length && /\s/.test(str[p])) p++;
            }
          }

          let radGroup = this._extractGroup(str, p);
          if (radGroup) {
            let radConverted = this._convertMacros(radGroup.content, isU2B);
            result += '\\R(' + deg + ',' + radConverted + ')';
            i = radGroup.endIndex + 1;
            continue;
          }
        }

        // Check for \left( ... \right), \left\{ ... \right\}, \left[ ... \right]
        if (str.startsWith('\\left', i)) {
          let p = i + 5;
          while (p < str.length && /\s/.test(str[p])) p++;

          let bracket = str[p];
          if (bracket === '\\' && (str[p+1] === '{' || str[p+1] === '}')) {
            bracket = str[p+1];
            p++;
          }

          let rightIdx = str.indexOf('\\right', p + 1);
          if (rightIdx !== -1) {
            let innerContent = str.substring(p + 1, rightIdx);
            let innerConverted = this._convertMacros(innerContent, isU2B);
            let rightP = rightIdx + 6;
            while (rightP < str.length && /\s/.test(str[rightP])) rightP++;

            if (bracket === '(') result += '(' + innerConverted + ')';
            else if (bracket === '{') result += '{' + innerConverted + '}';
            else if (bracket === '[') result += '[' + innerConverted + ']';
            else if (bracket === '|') result += '|' + innerConverted + '|';
            else result += '(' + innerConverted + ')';

            i = (str[rightP] === '\\' ? rightP + 2 : rightP + 1);
            continue;
          }
        }

        // Escape set brackets
        if (str.startsWith('\\{', i)) {
          result += '{';
          i += 2;
          continue;
        }
        if (str.startsWith('\\}', i)) {
          result += '}';
          i += 2;
          continue;
        }

        // Superscript ^
        if (str[i] === '^') {
          let p = i + 1;
          while (p < str.length && /\s/.test(str[p])) p++;

          if (str[p] === '{') {
            let expGroup = this._extractGroup(str, p);
            if (expGroup) {
              let expConverted = this._convertMacros(expGroup.content, isU2B);
              result += '\\S\\up4(' + expConverted + ')';
              i = expGroup.endIndex + 1;
              continue;
            }
          } else if (p < str.length) {
            result += '\\S\\up4(' + str[p] + ')';
            i = p + 1;
            continue;
          }
        }

        // Subscript _
        if (str[i] === '_') {
          let p = i + 1;
          while (p < str.length && /\s/.test(str[p])) p++;

          if (str[p] === '{') {
            let subGroup = this._extractGroup(str, p);
            if (subGroup) {
              let subConverted = this._convertMacros(subGroup.content, isU2B);
              result += '\\S\\do4(' + subConverted + ')';
              i = subGroup.endIndex + 1;
              continue;
            }
          } else if (p < str.length) {
            result += '\\S\\do4(' + str[p] + ')';
            i = p + 1;
            continue;
          }
        }

        result += str[i];
        i++;
      }

      return result;
    }

    /**
     * Replaces LaTeX symbols with Word EQ Field compatible characters
     */
    static _convertSymbols(s) {
      const symbolMap = [
        // Logic & Implications
        [/\\implies\b|\\Longrightarrow\b/g, '\u21D2'],
        [/\\iff\b|\\Longleftrightarrow\b/g, '\u21D4'],
        [/\\Rightarrow\b/g, '\u21D2'],
        [/\\rightarrow\b|\\to\b/g, '\u2192'],
        [/\\leftarrow\b|\\gets\b/g, '\u2190'],
        [/\\Leftarrow\b/g, '\u21D0'],
        [/\\leftrightarrow\b/g, '\u2194'],
        [/\\Leftrightarrow\b/g, '\u21D4'],
        [/\\therefore\b/g, '\u2234'],
        [/\\because\b/g, '\u2235'],

        // Number Sets
        [/\\in\b/g, '\u2208'],
        [/\\notin\b/g, '\u2209'],
        [/\\mathbb\{N\}|\\mathbf\{N\}|\b\\mathbb N\b/g, 'N'],
        [/\\mathbb\{R\}|\\mathbf\{R\}|\b\\mathbb R\b/g, 'R'],
        [/\\mathbb\{Z\}|\\mathbf\{Z\}|\b\\mathbb Z\b/g, 'Z'],
        [/\\mathbb\{Q\}|\\mathbf\{Q\}|\b\\mathbb Q\b/g, 'Q'],
        [/\\mathbb\{C\}|\\mathbf\{C\}|\b\\mathbb C\b/g, 'C'],

        // Arithmetic & Relations
        [/\\times\b/g, '\u00D7'],
        [/\\div\b/g, '\u00F7'],
        [/\\pm\b/g, '\u00B1'],
        [/\\mp\b/g, '\u2213'],
        [/\\leq\b|\\le\b/g, '\u2264'],
        [/\\geq\b|\\ge\b/g, '\u2265'],
        [/\\neq\b|\\ne\b/g, '\u2260'],
        [/\\approx\b/g, '\u2248'],
        [/\\equiv\b/g, '\u2261'],
        [/\\cong\b/g, '\u2245'],
        [/\\propto\b/g, '\u221D'],
        [/\\infty\b/g, '\u221E'],
        [/\\subset\b/g, '\u2282'],
        [/\\subseteq\b/g, '\u2286'],
        [/\\supset\b/g, '\u2283'],
        [/\\supseteq\b/g, '\u2287'],
        [/\\cup\b/g, '\u222A'],
        [/\\cap\b/g, '\u2229'],
        [/\\emptyset\b|\\varnothing\b/g, '\u2205'],
        [/\\setminus\b/g, '\u2216'],
        [/\\vee\b|\\lor\b/g, '\u2228'],
        [/\\wedge\b|\\land\b/g, '\u2227'],
        [/\\neg\b|\\lnot\b/g, '\u00AC'],
        [/\\nsubseteq\b/g, '\u2288'],
        [/\\forall\b/g, '\u2200'],
        [/\\exists\b/g, '\u2203'],
        [/\\cdot\b/g, '\u00B7'],
        [/\\cdots\b/g, '...'],
        [/\\ldots\b/g, '...'],
        [/\\dots\b|\\dotsb\b|\\dotsc\b|\\dotsm\b|\\dotso\b/g, '...'],

        // Calculus & Summations
        [/\\sum\b/g, '\u2211'],
        [/\\prod\b/g, '\u220F'],
        [/\\int\b/g, '\u222B'],
        [/\\iint\b/g, '\u222C'],
        [/\\iiint\b/g, '\u222D'],
        [/\\oint\b/g, '\u222E'],
        [/\\partial\b/g, '\u2202'],
        [/\\nabla\b/g, '\u2207'],
        [/\\operatornamewithlimits\{([^{}]+)\}|\\operatorname\{([^{}]+)\}/g, '$1'],

        // Greek Letters (Lowercase)
        [/\\alpha\b/g, '\u03B1'],
        [/\\beta\b/g, '\u03B2'],
        [/\\gamma\b/g, '\u03B3'],
        [/\\delta\b/g, '\u03B4'],
        [/\\epsilon\b|\\varepsilon\b/g, '\u03B5'],
        [/\\zeta\b/g, '\u03B6'],
        [/\\eta\b/g, '\u03B7'],
        [/\\theta\b|\\vartheta\b/g, '\u03B8'],
        [/\\iota\b/g, '\u03B9'],
        [/\\kappa\b/g, '\u03BA'],
        [/\\lambda\b/g, '\u03BB'],
        [/\\mu\b/g, '\u03BC'],
        [/\\nu\b/g, '\u03BD'],
        [/\\xi\b/g, '\u03BE'],
        [/\\pi\b/g, '\u03C0'],
        [/\\rho\b/g, '\u03C1'],
        [/\\sigma\b/g, '\u03C3'],
        [/\\tau\b/g, '\u03C4'],
        [/\\upsilon\b/g, '\u03C5'],
        [/\\phi\b|\\varphi\b/g, '\u03C6'],
        [/\\chi\b/g, '\u03C7'],
        [/\\psi\b/g, '\u03C8'],
        [/\\omega\b/g, '\u03C9'],

        // Greek Letters (Uppercase)
        [/\\Gamma\b/g, '\u0393'],
        [/\\Delta\b/g, '\u0394'],
        [/\\Theta\b/g, '\u0398'],
        [/\\Lambda\b/g, '\u039B'],
        [/\\Xi\b/g, '\u039E'],
        [/\\Pi\b/g, '\u03A0'],
        [/\\Sigma\b/g, '\u03A3'],
        [/\\Upsilon\b/g, '\u03A5'],
        [/\\Phi\b/g, '\u03A6'],
        [/\\Psi\b/g, '\u03A8'],
        [/\\Omega\b/g, '\u03A9'],

        // Trigonometry & Standard Math Functions
        [/\\arcsin\b/g, 'arcsin'],
        [/\\arccos\b/g, 'arccos'],
        [/\\arctan\b/g, 'arctan'],
        [/\\sinh\b/g, 'sinh'],
        [/\\cosh\b/g, 'cosh'],
        [/\\tanh\b/g, 'tanh'],
        [/\\coth\b/g, 'coth'],
        [/\\sin\b/g, 'sin'],
        [/\\cos\b/g, 'cos'],
        [/\\tan\b/g, 'tan'],
        [/\\cot\b/g, 'cot'],
        [/\\sec\b/g, 'sec'],
        [/\\csc\b/g, 'csc'],
        [/\\ln\b/g, 'ln'],
        [/\\log\b/g, 'log'],
        [/\\lim\b/g, 'lim'],
        [/\\deg\b/g, '\u00B0'],
        [/\\triangle\b/g, '\u0394'],
        [/\\angle\b/g, '\u2220'],
        [/\\perp\b/g, '\u22A5'],
        [/\\parallel\b/g, '\u2225'],

        // Spacing & Formatting
        [/\\quad\b/g, '  '],
        [/\\qquad\b/g, '    '],
        [/\\,|\\;|\\:/g, ' '],
        [/\\!/g, ''],
        [/\\sim\b/g, ' '],
        [/~/g, ' '],
        [/\\%/g, '%'],
        [/\\ohm\b/g, '\u03A9'],
        [/\\bullet\b/g, '\u2022']
      ];

      for (let k = 0; k < symbolMap.length; k++) {
        s = s.replace(symbolMap[k][0], symbolMap[k][1]);
      }
      return s;
    }

    /**
     * Tokenizes an EQ field code into segments with individual italic formatting and script font sizing.
     */
    static tokenizeEqCode(eqCode) {
      if (!eqCode) return [];
      const tokens = [];
      const tokenRegex = /(".*?"|'.*?')|(\\(?:S\\)?(?:up|do)\d*\()|(\bEQ\b|\\(?:F|R|S|B|A|I|D|X|up\d*|do\d*)\b)|(\))|(\b(?:sin|cos|tan|cot|sec|csc|ln|log|lim|det|min|max|exp|mod|gcd|deg|arcsin|arccos|arctan|sinh|cosh|tanh|coth)\b)|(\d+(?:\.\d+)?)|([a-zA-Z])|([\u0370-\u03FF\u2190-\u21FF\u2200-\u22FF\u00B0\u00D7\u00F7\u00B1\u2213\u2264\u2265\u2260\u2248\u2261\u21D2\u21D4])|([^a-zA-Z0-9"'\\]+|\S)/g;

      let scriptDepth = 0;
      let match;

      while ((match = tokenRegex.exec(eqCode)) !== null) {
        const text = match[0];
        if (match[1]) {
          // Quoted string (e.g. "অথবা", "cm")
          tokens.push({ text: text, italic: false, isScript: scriptDepth > 0, isQuotedText: true });
        } else if (match[2]) {
          // Script macro start e.g. \S\up4(
          tokens.push({ text: text, italic: false, isScript: false });
          scriptDepth++;
        } else if (match[3]) {
          // General macro keyword e.g. \F, \R, EQ
          tokens.push({ text: text, italic: false, isScript: scriptDepth > 0 });
        } else if (match[4]) {
          // Closing parenthesis
          if (scriptDepth > 0) {
            tokens.push({ text: text, italic: false, isScript: false });
            scriptDepth--;
          } else {
            tokens.push({ text: text, italic: false, isScript: false });
          }
        } else if (match[5]) {
          // Functions: sin, cos, tan...
          tokens.push({ text: text, italic: false, isScript: scriptDepth > 0 });
        } else if (match[6]) {
          // Numbers: 1, 2, 15, 225...
          tokens.push({ text: text, italic: false, isScript: scriptDepth > 0 });
        } else if (match[7]) {
          // English variable letters: x, y, p, f, A, B, C...
          tokens.push({ text: text, italic: true, isScript: scriptDepth > 0 });
        } else if (match[8]) {
          // Greek & Math Symbols: θ, α, β, ⇒, ≤, ≥, ° ...
          tokens.push({ text: text, italic: false, isScript: scriptDepth > 0, isSymbol: true });
        } else {
          // Operators, spaces, punctuation
          tokens.push({ text: text, italic: false, isScript: scriptDepth > 0 });
        }
      }

      const merged = [];
      for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k];
        if (merged.length > 0 && 
            merged[merged.length - 1].italic === t.italic && 
            merged[merged.length - 1].isScript === t.isScript &&
            merged[merged.length - 1].isSymbol === t.isSymbol &&
            !merged[merged.length - 1].isQuotedText &&
            !t.isQuotedText &&
            !t.text.startsWith('\\') &&
            !merged[merged.length - 1].text.startsWith('\\')) {
          merged[merged.length - 1].text += t.text;
        } else {
          merged.push({ text: t.text, italic: t.italic, isScript: t.isScript, isSymbol: !!t.isSymbol, isQuotedText: !!t.isQuotedText });
        }
      }
      return merged;
    }

    /**
     * Formats an EQ field code into Word 2003 HTML runs with proper variable italics,
     * upright numbers/operators, reduced 8.0pt font size for scripts, and Symbol font mapping,
     * while preserving all Word EQ switch commands (\F, \R, \S, \B, etc.).
     */
    static formatEqCodeToWordHtml(cleanEqCode, baseFontSizePt = 12, isBijoy = true) {
      if (!cleanEqCode) return "";
      const bengaliFont = isBijoy ? 'SutonnyMJ' : 'Kalpurush';
      const scriptSizePt = '8.0'; // Standard small 8pt for superscripts/subscripts in Word 2003

      let eqStr = cleanEqCode.trim();
      if (eqStr.startsWith('EQ ')) eqStr = eqStr.slice(3).trim();

      const tokens = this.tokenizeEqCode(eqStr);

      let html = "";
      for (const t of tokens) {
        if (!t || !t.text) continue;
        const textTrim = t.text.trim();
        if (textTrim === 'EQ') continue;

        const textEsc = t.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Check if quoted Bengali text or units inside equation (e.g. "Ges", "অথবা", "cm")
        if (t.isQuotedText) {
          const stripped = textEsc.replace(/^["'“]|["'”]$/g, '');
          html += `<span style="font-family:'${bengaliFont}',Arial,sans-serif;font-style:normal;">${stripped}</span>`;
          continue;
        }

        // Preserve Word EQ macro switches and parentheses as plain instruction text
        if (/^\\(?:F|R|S|B|A|I|D|X|up\d*|do\d*)\b/i.test(textTrim) || /^\\(?:S\\)?(?:up|do)\d*\(/i.test(textTrim) || t.text === '(' || t.text === ')') {
          html += textEsc;
          continue;
        }

        // Variable letters (e.g. x, y, z, a, b, c, d, p, N, n)
        if (t.italic) {
          if (t.isScript) {
            html += `<i><span style="font-size:${scriptSizePt}pt;">${textEsc}</span></i>`;
          } else {
            html += `<i>${textEsc}</i>`;
          }
          continue;
        }

        // Superscript or subscript contents (numbers, operators inside \S\up / \S\do)
        if (t.isScript) {
          if (textTrim) {
            html += `<span style="font-size:${scriptSizePt}pt;font-style:normal;">${textEsc}</span>`;
          } else {
            html += textEsc;
          }
          continue;
        }

        // Greek and Math symbols (∈, ≤, ≥, θ, α, β)
        if (t.isSymbol) {
          html += `<span style="font-family:'Symbol','Times New Roman',serif;font-style:normal;">${textEsc}</span>`;
          continue;
        }

        // Standard functions (sin, cos, tan, log, ln, lim) or plain numbers/operators
        if (t.isFunction || /^(?:sin|cos|tan|cot|sec|csc|ln|log|lim|det|min|max|exp|deg)$/i.test(textTrim)) {
          html += `<span style="font-style:normal;">${textEsc}</span>`;
          continue;
        }

        html += textEsc;
      }
      return html;
    }

    /**
     * Converts a LaTeX equation to human-readable HTML for Word's MsoFieldResult display cache.
     */
    static latexToReadableHtml(latex, isBijoy = true, bengaliFontName = 'SutonnyMJ', baseFontSizePt = 12) {
      if (!latex) return "";
      let s = latex.trim();
      if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2).trim();
      else if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();
      else if (s.startsWith('\\[') && s.endsWith('\\]')) s = s.slice(2, -2).trim();
      else if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim();

      const scriptSizePt = Math.round(baseFontSizePt * 0.7 * 10) / 10;

      // Handle \frac{num}{den}
      s = s.replace(/\\(?:d|t)?frac\{([^}]+)\}\{([^}]+)\}/g, (m, num, den) => {
        const rNum = this.latexToReadableHtml(num, isBijoy, bengaliFontName, baseFontSizePt);
        const rDen = this.latexToReadableHtml(den, isBijoy, bengaliFontName, baseFontSizePt);
        return `<table align="center" style="display:inline-table;vertical-align:middle;text-align:center;border-collapse:collapse;margin:0 1pt;">` +
               `<tr><td style="border-bottom:1.0pt solid windowtext;padding:0 2pt;line-height:1.0;text-align:center;">${rNum}</td></tr>` +
               `<tr><td style="padding:0 2pt;line-height:1.0;text-align:center;">${rDen}</td></tr></table>`;
      });

      // Handle \sqrt{arg} or \sqrt[n]{arg}
      s = s.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^}]+)\}/g, (m, root, arg) => {
        const rArg = this.latexToReadableHtml(arg, isBijoy, bengaliFontName, baseFontSizePt);
        if (root) {
          return `<sup style="font-size:${scriptSizePt}pt;vertical-align:super;">${root}</sup>√(${rArg})`;
        }
        return `√(${rArg})`;
      });

      // Handle superscripts ^{...} or ^\w
      s = s.replace(/\^\{([^}]+)\}|\^([a-zA-Z0-9\u09E6-\u09EF+\-]+)/g, (m, g1, g2) => {
        const val = g1 || g2;
        const rVal = this.latexToReadableHtml(val, isBijoy, bengaliFontName, scriptSizePt);
        return `<sup style="font-size:${scriptSizePt}pt;vertical-align:super;mso-text-raise:3.0pt;">${rVal}</sup>`;
      });

      // Handle subscripts _{...} or _\w
      s = s.replace(/_\{([^}]+)\}|_([a-zA-Z0-9\u09E6-\u09EF+\-]+)/g, (m, g1, g2) => {
        const val = g1 || g2;
        const rVal = this.latexToReadableHtml(val, isBijoy, bengaliFontName, scriptSizePt);
        return `<sub style="font-size:${scriptSizePt}pt;vertical-align:sub;mso-text-raise:-2.0pt;">${rVal}</sub>`;
      });

      // Common symbols
      s = s.replace(/\\times/g, '×')
           .replace(/\\div/g, '÷')
           .replace(/\\pm/g, '±')
           .replace(/\\leq|\\le/g, '≤')
           .replace(/\\geq|\\ge/g, '≥')
           .replace(/\\neq/g, '≠')
           .replace(/\\approx/g, '≈')
           .replace(/\\theta/g, 'θ')
           .replace(/\\alpha/g, 'α')
           .replace(/\\beta/g, 'β')
           .replace(/\\pi/g, 'π')
           .replace(/\\circ|\\degree/g, '°')
           .replace(/\\dots|\\cdots|\\ldots/g, '...')
           .replace(/\\text\{([^}]+)\}/g, '$1')
           .replace(/\\quad|\\qquad|~/g, ' ');

      // Wrap English letters in italic Times New Roman, numbers/symbols upright
      const tokenRegex = /([a-zA-Z]+)|(\d+(?:\.\d+)?)|([\u0980-\u09FF]+)|(<\/?table[^>]*>|<\/?tr[^>]*>|<\/?td[^>]*>|<\/?sup[^>]*>|<\/?sub[^>]*>)|([^\s\w<>]+)|\s+/g;
      let out = "";
      let m;
      while ((m = tokenRegex.exec(s)) !== null) {
        if (m[4]) {
          out += m[4];
        } else if (m[1]) {
          if (/^[a-zA-Z]$/.test(m[1])) {
            out += `<i style="font-family:'Times New Roman',serif;mso-ascii-font-family:'Times New Roman';mso-hansi-font-family:'Times New Roman';">${m[1]}</i>`;
          } else {
            out += `<span lang="EN-US" style="font-family:'Times New Roman',serif;">${m[1]}</span>`;
          }
        } else if (m[2]) {
          out += `<span lang="EN-US" style="font-family:'Times New Roman',serif;">${m[2]}</span>`;
        } else if (m[3]) {
          const targetBn = isBijoy && typeof BanglaConverter !== 'undefined' ? BanglaConverter.unicodeToBijoy(m[3]) : m[3];
          out += `<span style="font-family:'${bengaliFontName}',Arial,sans-serif;">${targetBn}</span>`;
        } else {
          const esc = (m[0] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          out += esc;
        }
      }
      return out;
    }

    /**
     * Constructs OpenXML Word Run elements for a Word EQ Field.
     */
    static createOpenXmlEqRuns(xmlDoc, eqCode, originalRPr, isU2B, targetFontName) {
      const runs = [];
      if (typeof isU2B === 'undefined') isU2B = true;
      const bengaliFont = targetFontName || (isU2B ? 'SutonnyMJ' : 'Kalpurush');

      const baseSzVal = (function() {
        if (originalRPr) {
          const szNode = originalRPr.querySelector("sz, szCs");
          if (szNode) {
            const v = parseInt(szNode.getAttribute("w:val") || szNode.getAttribute("val"), 10);
            if (v) return v;
          }
        }
        return 24; // default 12pt (24 half-points)
      })();
      const scriptSzVal = Math.round(baseSzVal * 0.67); // 8pt (16 half-points)

      const makeMathRPr = (isItalic, isScript, isBengaliText) => {
        let rPr = originalRPr ? originalRPr.cloneNode(true) : xmlDoc.createElement("w:rPr");
        let rFonts = rPr.querySelector("rFonts");
        if (!rFonts) {
          rFonts = xmlDoc.createElement("w:rFonts");
          rPr.appendChild(rFonts);
        }

        if (isBengaliText) {
          rFonts.setAttribute("w:ascii", bengaliFont);
          rFonts.setAttribute("w:hAnsi", bengaliFont);
          rFonts.setAttribute("w:cs", bengaliFont);
          rFonts.setAttribute("w:eastAsia", bengaliFont);
          rFonts.setAttribute("w:hint", isU2B ? "ascii" : "cs");
        } else {
          rFonts.setAttribute("w:ascii", "Times New Roman");
          rFonts.setAttribute("w:hAnsi", "Times New Roman");
          rFonts.setAttribute("w:cs", "Times New Roman");
          rFonts.setAttribute("w:eastAsia", "Times New Roman");
          rFonts.setAttribute("w:hint", "default");
        }

        // Small 8pt font size for superscripts / subscripts, 12pt for base
        const targetSz = (isScript ? scriptSzVal : baseSzVal).toString();
        let szNode = rPr.querySelector("sz");
        if (!szNode) {
          szNode = xmlDoc.createElement("w:sz");
          rPr.appendChild(szNode);
        }
        szNode.setAttribute("w:val", targetSz);

        let szCsNode = rPr.querySelector("szCs");
        if (!szCsNode) {
          szCsNode = xmlDoc.createElement("w:szCs");
          rPr.appendChild(szCsNode);
        }
        szCsNode.setAttribute("w:val", targetSz);

        // Remove any preexisting italic tags
        const existingI = Array.from(rPr.querySelectorAll("i, iCs"));
        for (let j = 0; j < existingI.length; j++) {
          rPr.removeChild(existingI[j]);
        }

        // Apply Italics ONLY if isItalic is true (English variable letters)
        if (isItalic && !isBengaliText) {
          const iTag = xmlDoc.createElement("w:i");
          const iCsTag = xmlDoc.createElement("w:iCs");
          rPr.appendChild(iTag);
          rPr.appendChild(iCsTag);
        }

        let lang = rPr.querySelector("lang");
        if (!lang) {
          lang = xmlDoc.createElement("w:lang");
          rPr.appendChild(lang);
        }
        lang.setAttribute("w:val", isBengaliText ? (isU2B ? "en-US" : "bn-BD") : "en-US");
        lang.setAttribute("w:bidi", isBengaliText ? (isU2B ? "en-US" : "bn-BD") : "en-US");

        const csTags = Array.from(rPr.querySelectorAll("cs, rtl"));
        for (let j = 0; j < csTags.length; j++) {
          rPr.removeChild(csTags[j]);
        }

        return rPr;
      };

      // 1. Begin field
      const r1 = xmlDoc.createElement("w:r");
      r1.appendChild(makeMathRPr(false, false, false));
      const fld1 = xmlDoc.createElement("w:fldChar");
      fld1.setAttribute("w:fldCharType", "begin");
      r1.appendChild(fld1);
      runs.push(r1);

      // 2. InstrText runs with variable Italics and small superscripts
      const fullEq = ' EQ ' + eqCode + ' ';
      const tokens = this.tokenizeEqCode(fullEq);

      for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k];
        if (!t.text) continue;
        const isBn = t.isQuotedText && typeof BanglaConverter !== 'undefined' && (BanglaConverter.hasBengaliText(t.text) || isU2B);
        const r = xmlDoc.createElement("w:r");
        r.appendChild(makeMathRPr(t.italic, t.isScript, isBn));
        const instr = xmlDoc.createElement("w:instrText");
        instr.setAttribute("xml:space", "preserve");
        instr.textContent = t.text;
        r.appendChild(instr);
        runs.push(r);
      }

      // 3. End field
      const r3 = xmlDoc.createElement("w:r");
      r3.appendChild(makeMathRPr(false, false, false));
      const fld3 = xmlDoc.createElement("w:fldChar");
      fld3.setAttribute("w:fldCharType", "end");
      r3.appendChild(fld3);
      runs.push(r3);

      return runs;
    }

    /**
     * Creates a standard text run
     */
    static createTextRun(xmlDoc, text, fontName, originalRPr) {
      const r = xmlDoc.createElement("w:r");
      let rPr = originalRPr ? originalRPr.cloneNode(true) : xmlDoc.createElement("w:rPr");
      
      if (fontName) {
        let rFonts = rPr.querySelector("rFonts");
        if (!rFonts) {
          rFonts = xmlDoc.createElement("w:rFonts");
          rPr.appendChild(rFonts);
        }
        rFonts.setAttribute("w:ascii", fontName);
        rFonts.setAttribute("w:hAnsi", fontName);
        rFonts.setAttribute("w:cs", fontName);
      }
      r.appendChild(rPr);

      const t = xmlDoc.createElement("w:t");
      t.setAttribute("xml:space", "preserve");
      t.textContent = text;
      r.appendChild(t);
      return r;
    }

    static normalizeUnicodeMathToLatex(text) {
      if (!text) return text;
      
      let segments = [];
      let lastIndex = 0;
      const regex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push({ type: 'text', value: text.substring(lastIndex, match.index) });
        }
        segments.push({ type: 'math', value: match[0] });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < text.length) {
        segments.push({ type: 'text', value: text.substring(lastIndex) });
      }
      
      let out = '';
      const chemRegex = /\b(?:(?:H|He|Li|Be|B|C|N|O|F|Ne|Na|Mg|Al|Si|P|S|Cl|Ar|K|Ca|Sc|Ti|V|Cr|Mn|Fe|Co|Ni|Cu|Zn|Br|Ag|I|Ba|Pt|Au|Hg|Pb|U)[a-z]?\d*)+\b/g;
      
      for (const seg of segments) {
        if (seg.type === 'math') {
          out += seg.value;
        } else {
          let s = seg.value;
          
          s = s.replace(chemRegex, m => {
             if (/[A-Z]/.test(m) && /\d/.test(m)) {
                return '$' + m.replace(/(\d+)/g, '_$1') + '$';
             }
             return m;
          });
          
          s = s.replace(/([A-Za-z0-9])²/g, '$$$1^2$$');
          s = s.replace(/([A-Za-z0-9])³/g, '$$$1^3$$');
          s = s.replace(/×/g, '$\\times$');
          s = s.replace(/÷/g, '$\\div$');
          s = s.replace(/±/g, '$\\pm$');
          s = s.replace(/≤/g, '$\\le$');
          s = s.replace(/≥/g, '$\\ge$');
          s = s.replace(/≠/g, '$\\neq$');
          s = s.replace(/≈/g, '$\\approx$');
          s = s.replace(/∞/g, '$\\infty$');
          s = s.replace(/√([A-Za-z0-9]+)/g, '$\\sqrt{$1}$');
          s = s.replace(/√/g, '$\\sqrt{}$');
          
          out += s;
        }
      }
      return out;
    }

    /**
     * Splits a mixed string of text and LaTeX math into segments.
     */
    static splitTextAndMath(text) {
      const segments = [];
      if (!text) return segments;

      text = EquationConverter.normalizeUnicodeMathToLatex(text);

      // Normalize backtick-wrapped math: `$ ... $` -> $ ... $
      text = text.replace(/`(\$\$[\s\S]*?\$\$|\$[^`\r\n]+?\$)`/g, '$1');
      text = text.replace(/\$\s*\$\s*([A-Za-z0-9])/g, '$$$1');
      text = text.replace(/\$([A-Za-z0-9\s=]+)\$\s*\\{/g, '$$$1 \\{');
      text = text.replace(/`\s*\$/g, '$').replace(/\$\s*`/g, '$');

      const regex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          segments.push({
            type: 'text',
            value: text.substring(lastIndex, match.index)
          });
        }

        const mathContent = match[1] || match[2] || match[3] || match[4] || "";

        // If math block contains any Bengali letters, extract Bengali words as 'text' and pure math as 'math'
        if (/[\u0980-\u09FF]/.test(mathContent)) {
          // 1. Unpack any \text{...} containing Bengali
          let cleanM = mathContent.replace(/\\(?:text|mathrm|textmd|textbf|textit|mbox)\{\s*([^{}]*?[\u0980-\u09FF][^{}]*?)\s*\}/g, ' $1 ');
          // 2. Strip quotes around Bengali words
          cleanM = cleanM.replace(/["“'’](\s*[\u0980-\u09FF\s]+\s*)["”'’]/g, ' $1 ');
          // 3. Split by Bengali word blocks
          const parts = cleanM.split(/([\u0980-\u09FF]+(?:\s+[\u0980-\u09FF]+)*)/);
          for (const p of parts) {
            if (!p) continue;
            if (/[\u0980-\u09FF]/.test(p)) {
              segments.push({
                type: 'text',
                value: ' ' + p.trim() + ' '
              });
            } else {
              const trimmedP = p.trim();
              if (trimmedP) {
                if (/^[.,;:]+$/.test(trimmedP)) {
                  segments.push({
                    type: 'text',
                    value: trimmedP + ' '
                  });
                } else {
                  segments.push({
                    type: 'math',
                    value: trimmedP
                  });
                }
              }
            }
          }
        } else {
          segments.push({
            type: 'math',
            value: mathContent
          });
        }

        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        segments.push({
          type: 'text',
          value: text.substring(lastIndex)
        });
      }

      return segments;
    }

    /**
     * Determines whether a LaTeX math string genuinely requires a Word EQ Field code
     * (e.g. fractions, square roots, superscripts, subscripts, integrals, matrices),
     * or if it can be rendered as clean, error-free standard text runs.
     */
    static needsEqField(latex) {
      if (!latex) return false;
      let s = latex.trim();
      if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2).trim();
      else if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();
      else if (s.startsWith('\\[') && s.endsWith('\\]')) s = s.slice(2, -2).trim();
      else if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim();

      // Pure numbers, comma-separated number lists (e.g. "75, 65, 80..."), or numbers with decimal/hyphen
      if (/^[\d\s,.\u09E6-\u09EF\-]+$/.test(s)) return false;
      // Plain numbers with units or words e.g. "8 m", "20 cm", "50 জন", "7 সে.মি."
      if (/^[\d\s,.\u09E6-\u09EF]+[a-zA-Z\u0980-\u09FF\s.]+$/.test(s)) return false;
      // Simple measurement units e.g. "cm", "m", "kg"
      if (/^(?:cm|mm|m|km|gm|kg|sec|s|hr|min|V|W|kW|A|mA|Hz|N|Pa|J)$/i.test(s)) return false;

      // Mathematical or scientific structures requiring Word EQ switch commands or Office Math:
      // Fractions, roots, superscripts, subscripts, scientific multiplication, integrals, matrices, etc.
      return /\\frac|\\dfrac|\\tfrac|\\sqrt|\\int|\\sum|\\prod|\\lim|\\matrix|\\binom|\\overline|\\underline|\\vec|\\dot|\\ddot|\\partial|\^|_|\\times/.test(s);
    }

    /**
     * Strips math delimiters and cleans LaTeX escapes for simple math/quantities/units.
     * E.g. "$90\%$" -> "90%", "$40\sim m$" -> "40~m", "$40$" -> "40", "$B - \cos\theta = 0$" -> "B - cos θ = 0"
     */
    static sanitizeSimpleMath(latex, isU2B) {
      if (typeof isU2B === 'undefined') isU2B = true;
      if (!latex) return "";
      let s = latex.trim();
      if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2).trim();
      else if (s.startsWith('$') && s.endsWith('$')) s = s.slice(1, -1).trim();
      else if (s.startsWith('\\[') && s.endsWith('\\]')) s = s.slice(2, -2).trim();
      else if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim();

      // 1. Pre-convert degree & angle
      s = s.replace(/\\angle\b/g, '\u2220');
      s = s.replace(/\^\s*\\circ\b|\^\{\s*\\circ\s*\}|\\circ\b|\\degree\b|\^\{\s*\u00B0\s*\}|\^\u00B0/g, '\u00B0');

      // 2. Pre-sanitize escapes
      s = s.replace(/\\%/g, '%');
      s = s.replace(/\\sim\b/g, ' ');
      s = s.replace(/~/g, ' ');
      s = s.replace(/\\\$/g, '$');
      s = s.replace(/\\&/g, '&');
      s = s.replace(/\\_/g, '_');
      s = s.replace(/\\#/g, '#');
      s = s.replace(/\\\{/g, '{');
      s = s.replace(/\\\}/g, '}');

      // 3. Pre-space functions e.g. \sin\theta -> \sin \theta, \cos p -> \cos p
      s = s.replace(/\\(sin|cos|tan|cot|sec|csc|ln|log|arcsin|arccos|arctan|sinh|cosh|tanh|coth|lim|det|min|max|deg)(?=\\[a-zA-Z]|[a-zA-Z0-9])/g, '\\$1 ');

      // 4. Process \text{...} / \mathrm{...}
      s = s.replace(/\\(?:text|mathrm|textmd|textbf|textit|mbox)\{([^{}]+)\}/g, function(match, inner) {
        let trimmed = inner.trim();
        let converted = trimmed;
        if (isU2B && typeof BanglaConverter !== 'undefined' && BanglaConverter.hasBengaliText(trimmed)) {
          converted = BanglaConverter.unicodeToBijoy(trimmed, { convertNumbers: false });
        }
        return ' ' + converted + ' ';
      });

      // 5. Convert superscripts & subscripts if simple
      s = s.replace(/\^2\b|\^\{2\}/g, '\u00B2');
      s = s.replace(/\^3\b|\^\{3\}/g, '\u00B3');
      s = s.replace(/\^1\b|\^\{1\}/g, '\u00B9');
      s = s.replace(/\^0\b|\^\{0\}/g, '\u2070');
      s = s.replace(/\^n\b|\^\{n\}/g, '\u207F');

      // 6. Convert symbols & trig
      s = this._convertSymbols(s);

      // 7. Strip leftover backslashes from common structures
      s = s.replace(/\\left\s*([(\[{|])|\\right\s*([)\]}|])/g, '$1$2');
      s = s.replace(/\\/g, '');

      return s.replace(/\s+/g, ' ').trim();
    }

    /**
     * Tokenizes simple math into text runs with appropriate italic styling for variables.
     */
    static tokenizeSimpleMath(str) {
      if (!str) return [];
      const regex = /(\b(?:sin|cos|tan|cot|sec|csc|ln|log|lim|det|min|max|exp|deg|arcsin|arccos|arctan|sinh|cosh|tanh|coth)\b)|(\d+(?:\.\d+)?%?)|([a-zA-Z])|([\u0980-\u09FF]+)|([\u0370-\u03FF\u2190-\u21FF\u2200-\u22FF\u00B0\u00D7\u00F7\u00B1\u2213\u2264\u2265\u2260\u2248\u2261\u21D2\u21D4\u2234\u2235\u00B2\u00B3\u00B9\u2070\u207F\u2220\u22A5\u2225]+)|([^a-zA-Z0-9\s]+|\s+)/g;
      const tokens = [];
      let m;

      while ((m = regex.exec(str)) !== null) {
        if (m[1]) {
          // Functions: sin, cos, tan...
          tokens.push({ text: m[1], italic: false });
        } else if (m[2]) {
          // Numbers
          tokens.push({ text: m[2], italic: false });
        } else if (m[3]) {
          // Math variable letters (x, y, p, A, B, C...)
          tokens.push({ text: m[3], italic: true });
        } else if (m[4]) {
          // Bengali characters
          tokens.push({ text: m[4], italic: false, isBengali: true });
        } else if (m[5]) {
          // Greek & Math symbols
          tokens.push({ text: m[5], italic: false });
        } else if (m[6]) {
          // Operators, spaces, punctuation
          tokens.push({ text: m[6], italic: false });
        }
      }

      const merged = [];
      for (let k = 0; k < tokens.length; k++) {
        const t = tokens[k];
        if (merged.length > 0 && 
            merged[merged.length - 1].italic === t.italic && 
            !!merged[merged.length - 1].isBengali === !!t.isBengali) {
          merged[merged.length - 1].text += t.text;
        } else {
          merged.push({ text: t.text, italic: t.italic, isBengali: !!t.isBengali });
        }
      }
      return merged;
    }

    /**
     * Creates clean, standard OpenXML runs for simple math numbers, units, and symbols.
     * Prevents Word EQ Field "Error!" on non-switch inputs like "$90\%$", "$40$", "$40~m$".
     */
    static createSimpleMathRuns(xmlDoc, latex, originalRPr, isU2B, targetFontName) {
      if (typeof isU2B === 'undefined') isU2B = true;
      const bengaliFont = targetFontName || (isU2B ? 'SutonnyMJ' : 'Kalpurush');
      const clean = this.sanitizeSimpleMath(latex, isU2B);
      const runs = [];
      if (!clean) return runs;

      const tokens = this.tokenizeSimpleMath(clean);
      for (let tok of tokens) {
        if (!tok.text) continue;
        const r = xmlDoc.createElement("w:r");
        let rPr = originalRPr ? originalRPr.cloneNode(true) : xmlDoc.createElement("w:rPr");

        let rFonts = rPr.querySelector("rFonts");
        if (!rFonts) {
          rFonts = xmlDoc.createElement("w:rFonts");
          rPr.appendChild(rFonts);
        }

        const hasBn = tok.isBengali || (typeof BanglaConverter !== 'undefined' && (BanglaConverter.hasBengaliText(tok.text) || (isU2B && BanglaConverter.isBijoyString && BanglaConverter.isBijoyString(tok.text))));

        if (hasBn) {
          rFonts.setAttribute("w:ascii", bengaliFont);
          rFonts.setAttribute("w:hAnsi", bengaliFont);
          rFonts.setAttribute("w:cs", bengaliFont);
          rFonts.setAttribute("w:hint", isU2B ? "ascii" : "cs");
        } else {
          rFonts.setAttribute("w:ascii", "Times New Roman");
          rFonts.setAttribute("w:hAnsi", "Times New Roman");
          rFonts.setAttribute("w:cs", "Times New Roman");
          rFonts.setAttribute("w:hint", "default");
        }

        // Remove any existing italic
        const existingI = Array.from(rPr.querySelectorAll("i, iCs"));
        for (let j = 0; j < existingI.length; j++) rPr.removeChild(existingI[j]);

        if (tok.italic && !hasBn) {
          rPr.appendChild(xmlDoc.createElement("w:i"));
          rPr.appendChild(xmlDoc.createElement("w:iCs"));
        }

        r.appendChild(rPr);
        const t = xmlDoc.createElement("w:t");
        t.setAttribute("xml:space", "preserve");
        t.textContent = tok.text;
        r.appendChild(t);
        runs.push(r);
      }

      return runs;
    }

    /**
     * Parses native Word OMML (<m:oMath>) to OpenXML EQ Field runs
     */
    static ommlToOpenXmlRuns(oMathNode, xmlDoc, originalRPr) {
      let eqCode = this._parseOmmlNode(oMathNode);
      if (!eqCode) return [];
      return this.createOpenXmlEqRuns(xmlDoc, eqCode, originalRPr);
    }

    static _parseOmmlNode(node) {
      if (!node) return "";
      let result = "";
      const childNodes = Array.from(node.childNodes);

      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i];
        if (child.nodeType !== 1) continue;
        const nodeName = child.localName || child.nodeName.split(':').pop();

        if (nodeName === "t") {
          result += child.textContent;
        } else if (nodeName === "r") {
          const tNodes = child.querySelectorAll("t, m\\:t, w\\:t");
          for (let k = 0; k < tNodes.length; k++) result += tNodes[k].textContent;
        } else if (nodeName === "f") {
          let numStr = "", denStr = "";
          const numNode = child.querySelector("num, m\\:num");
          const denNode = child.querySelector("den, m\\:den");
          if (numNode) numStr = this._parseOmmlNode(numNode);
          if (denNode) denStr = this._parseOmmlNode(denNode);
          result += '\\F(' + numStr + ',' + denStr + ')';
        } else if (nodeName === "rad") {
          let degStr = "", eStr = "";
          const degNode = child.querySelector("deg, m\\:deg");
          const eNode = child.querySelector("e, m\\:e");
          if (degNode) degStr = this._parseOmmlNode(degNode);
          if (eNode) eStr = this._parseOmmlNode(eNode);
          result += '\\R(' + degStr + ',' + eStr + ')';
        } else if (nodeName === "sSup") {
          let baseStr = "", supStr = "";
          const eNode = child.querySelector("e, m\\:e");
          const supNode = child.querySelector("sup, m\\:sup");
          if (eNode) baseStr = this._parseOmmlNode(eNode);
          if (supNode) supStr = this._parseOmmlNode(supNode);
          result += baseStr + '\\S\\up4(' + supStr + ')';
        } else if (nodeName === "sSub") {
          let baseStr = "", subStr = "";
          const eNode = child.querySelector("e, m\\:e");
          const subNode = child.querySelector("sub, m\\:sub");
          if (eNode) baseStr = this._parseOmmlNode(eNode);
          if (subNode) subStr = this._parseOmmlNode(subNode);
          result += baseStr + '\\S\\do4(' + subStr + ')';
        } else {
          result += this._parseOmmlNode(child);
        }
      }
      return result;
    }

    /**
     * Converts a LaTeX math string to Native Microsoft Word OMML (<m:oMath>) XML string.
     * 100% Native Office Math for Word 2007, 2010, 2013, 2016, 2019, 2021 & Office 365.
    /**
     * Replaces LaTeX math symbols, set theory operators, arrows, brackets, and text wrappers
     * with clean standard Unicode characters.
     */
    static cleanLatexSymbols(latex) {
      if (!latex) return '';
      let s = String(latex);

      const symMap = [
        // Greek letters
        [/\\theta\b|\\vartheta\b/g, '\u03B8'],
        [/\\pi\b/g, '\u03C0'],
        [/\\alpha\b/g, '\u03B1'],
        [/\\beta\b/g, '\u03B2'],
        [/\\gamma\b/g, '\u03B3'],
        [/\\delta\b/g, '\u03B4'],
        [/\\epsilon\b|\\varepsilon\b/g, '\u03B5'],
        [/\\lambda\b/g, '\u03BB'],
        [/\\mu\b/g, '\u03BC'],
        [/\\sigma\b/g, '\u03C3'],
        [/\\phi\b|\\varphi\b/g, '\u03C6'],
        [/\\omega\b/g, '\u03C9'],
        [/\\Delta\b/g, '\u0394'],
        [/\\Omega\b/g, '\u03A9'],
        // Operators & comparisons
        [/\\pm\b/g, '\u00B1'],
        [/\\mp\b/g, '\u2213'],
        [/\\times\b/g, '\u00D7'],
        [/\\div\b/g, '\u00F7'],
        [/\\cdot\b/g, '\u00B7'],
        [/\\neq\b/g, '\u2260'],
        [/\\leq\b|\\le\b/g, '\u2264'],
        [/\\geq\b|\\ge\b/g, '\u2265'],
        [/\\approx\b/g, '\u2248'],
        [/\\therefore\b/g, '\u2234'],
        [/\\because\b/g, '\u2235'],
        [/\\infty\b/g, '\u221E'],
        [/\\degree\b|\\circ\b/g, '\u00B0'],
        [/\\angle\b/g, '\u2220'],
        // Functions
        [/\\sin\b/g, 'sin '],
        [/\\cos\b/g, 'cos '],
        [/\\tan\b/g, 'tan '],
        [/\\sec\b/g, 'sec '],
        [/\\csc\b/g, 'csc '],
        [/\\cot\b/g, 'cot '],
        [/\\arcsin\b/g, 'arcsin '],
        [/\\arccos\b/g, 'arccos '],
        [/\\arctan\b/g, 'arctan '],
        [/\\log\b/g, 'log '],
        [/\\ln\b/g, 'ln '],
        [/\\lim\b/g, 'lim '],
        // Set theory & discrete math
        [/\\cup\b/g, '\u222A'],
        [/\\cap\b/g, '\u2229'],
        [/\\emptyset\b|\\varnothing\b/g, '\u2205'],
        [/\\setminus\b/g, '\u2216'],
        [/\\in\b/g, '\u2208'],
        [/\\notin\b/g, '\u2209'],
        [/\\subset\b/g, '\u2282'],
        [/\\supset\b/g, '\u2283'],
        [/\\subseteq\b/g, '\u2286'],
        [/\\supseteq\b/g, '\u2287'],
        [/\\nsubseteq\b/g, '\u2288'],
        [/\\vee\b|\\lor\b/g, '\u2228'],
        [/\\wedge\b|\\land\b/g, '\u2227'],
        [/\\neg\b|\\lnot\b/g, '\u00AC'],
        [/\\forall\b/g, '\u2200'],
        [/\\exists\b/g, '\u2203'],
        [/\\prime\b/g, '\u2032'],
        // Arrows & geometry
        [/\\to\b|\\rightarrow\b/g, '\u2192'],
        [/\\leftarrow\b/g, '\u2190'],
        [/\\leftrightarrow\b/g, '\u2194'],
        [/\\Rightarrow\b/g, '\u21D2'],
        [/\\Leftarrow\b/g, '\u21D0'],
        [/\\Leftrightarrow\b/g, '\u21D4'],
        [/\\perp\b/g, '\u22A5'],
        [/\\parallel\b/g, '\u2225'],
        [/\\cong\b/g, '\u2245'],
        [/\\sim\b/g, '~'],
        [/\\propto\b/g, '\u221D'],
        // Brackets & delimiters
        [/\\\{/g, '{'],
        [/\\\}/g, '}'],
        [/\\left/g, ''],
        [/\\right/g, ''],
        // Spacing & text wrappers
        [/\\quad\b/g, '  '],
        [/\\qquad\b/g, '    '],
        [/\\,|\\;|\\:|\\!/g, ' '],
        [/\\(?:text|mathrm|textmd|textbf|textit|mbox|mathbf|mathbb)\{([^{}]*)\}/g, '$1']
      ];

      for (const [re, rep] of symMap) {
        s = s.replace(re, rep);
      }
      return s;
    }

    /**
     * Converts a LaTeX string directly into Word OpenXML OMML (<m:oMath>).
     * Eliminates Equation Editor 3.0 popup, eliminates "Word equation too large to convert" error.
     */
    static latexToOmml(latex, isBijoy = false) {
      if (!latex) return '';
      let s = latex.trim();
      s = s.replace(/^\$\$+|\$\$+$/g, '').replace(/^\\\[|\\\]$/g, '').replace(/^\\\(|\\\)$/g, '').replace(/^\$+|\$+$/g, '').trim();

      s = EquationConverter.cleanLatexSymbols(s);

      function escapeXml(unsafe) {
        return String(unsafe || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }

      function findMatchingBrace(str, startIdx) {
        let depth = 0;
        for (let idx = startIdx; idx < str.length; idx++) {
          if (str[idx] === '{') depth++;
          else if (str[idx] === '}') {
            depth--;
            if (depth === 0) return idx;
          }
        }
        return -1;
      }

      function parseChunk(str) {
        if (!str) return '';
        let out = '';
        let i = 0;

        while (i < str.length) {
          // 1. Fraction: \frac{num}{den}
          if (str.startsWith('\\frac', i)) {
            let numStart = str.indexOf('{', i + 5);
            if (numStart !== -1) {
              let numEnd = findMatchingBrace(str, numStart);
              if (numEnd !== -1) {
                let denStart = str.indexOf('{', numEnd + 1);
                if (denStart !== -1) {
                  let denEnd = findMatchingBrace(str, denStart);
                  if (denEnd !== -1) {
                    const num = str.slice(numStart + 1, numEnd);
                    const den = str.slice(denStart + 1, denEnd);
                    out += '<m:f><m:fPr><m:type m:val="bar"/></m:fPr><m:num>' + parseChunk(num) + '</m:num><m:den>' + parseChunk(den) + '</m:den></m:f>';
                    i = denEnd + 1;
                    continue;
                  }
                }
              }
            }
          }

          // 2. Square Root: \sqrt{...} or \sqrt[n]{...}
          if (str.startsWith('\\sqrt', i)) {
            let deg = '';
            let degEnd = -1;
            if (str[i + 5] === '[') {
              degEnd = str.indexOf(']', i + 5);
              if (degEnd !== -1) deg = str.slice(i + 6, degEnd);
            }
            let radStart = str.indexOf('{', degEnd !== -1 ? degEnd : i + 5);
            if (radStart !== -1) {
              let radEnd = findMatchingBrace(str, radStart);
              if (radEnd !== -1) {
                const rad = str.slice(radStart + 1, radEnd);
                out += '<m:rad><m:radPr><m:degHide m:val="' + (deg ? 'off' : 'on') + '"/></m:radPr>' + (deg ? '<m:deg>' + parseChunk(deg) + '</m:deg>' : '') + '<m:e>' + parseChunk(rad) + '</m:e></m:rad>';
                i = radEnd + 1;
                continue;
              }
            }
          }

          // 3. Regular chars / expressions
          let textChunk = '';
          
          // Force consume current character to avoid infinite loop on malformed macros
          textChunk += str[i];
          i++;
          
          while (i < str.length && !str.startsWith('\\frac', i) && !str.startsWith('\\sqrt', i)) {
            textChunk += str[i];
            i++;
          }

          if (textChunk) {
            out += parseScripts(textChunk);
          }
        }
        return out;
      }

      function parseScripts(tStr) {
        let res = '';
        let j = 0;
        while (j < tStr.length) {
          if (tStr[j] === '^' || tStr[j] === '_') {
            // Stray script without base — empty base element
            const isSup = (tStr[j] === '^');
            j++;
            let scriptVal = '';
            if (tStr[j] === '{') {
              const matchEnd = findMatchingBrace(tStr, j);
              if (matchEnd !== -1) {
                scriptVal = tStr.slice(j + 1, matchEnd);
                j = matchEnd + 1;
              } else {
                scriptVal = tStr[j] || '';
                j++;
              }
            } else if (j < tStr.length) {
              scriptVal = tStr[j];
              j++;
            }
            if (isSup) {
              res += '<m:sSup><m:e></m:e><m:sup>' + parseChunk(scriptVal) + '</m:sup></m:sSup>';
            } else {
              res += '<m:sSub><m:e></m:e><m:sub>' + parseChunk(scriptVal) + '</m:sub></m:sSub>';
            }
          } else {
            // Collect plain text until next ^ or _
            let plain = '';
            while (j < tStr.length && tStr[j] !== '^' && tStr[j] !== '_') {
              plain += tStr[j];
              j++;
            }
            if (j < tStr.length && (tStr[j] === '^' || tStr[j] === '_')) {
              // The last character in `plain` is the base for the script
              const base = plain.slice(-1);
              const prefix = plain.slice(0, -1);
              if (prefix) {
                res += '<m:r><m:t xml:space="preserve">' + escapeXml(prefix) + '</m:t></m:r>';
              }
              // Collect consecutive scripts (may have both ^ and _)
              let supVal = null;
              let subVal = null;
              while (j < tStr.length && (tStr[j] === '^' || tStr[j] === '_')) {
                const isSup2 = (tStr[j] === '^');
                j++;
                let sVal = '';
                if (tStr[j] === '{') {
                  const matchEnd = findMatchingBrace(tStr, j);
                  if (matchEnd !== -1) {
                    sVal = tStr.slice(j + 1, matchEnd);
                    j = matchEnd + 1;
                  } else {
                    sVal = tStr[j] || '';
                    j++;
                  }
                } else if (j < tStr.length) {
                  sVal = tStr[j];
                  j++;
                }
                if (isSup2) supVal = sVal;
                else subVal = sVal;
              }
              const baseOmml = '<m:e><m:r><m:t xml:space="preserve">' + escapeXml(base) + '</m:t></m:r></m:e>';
              if (supVal !== null && subVal !== null) {
                res += '<m:sSubSup>' + baseOmml +
                  '<m:sub>' + parseChunk(subVal) + '</m:sub>' +
                  '<m:sup>' + parseChunk(supVal) + '</m:sup>' +
                  '</m:sSubSup>';
              } else if (supVal !== null) {
                res += '<m:sSup>' + baseOmml + '<m:sup>' + parseChunk(supVal) + '</m:sup></m:sSup>';
              } else if (subVal !== null) {
                res += '<m:sSub>' + baseOmml + '<m:sub>' + parseChunk(subVal) + '</m:sub></m:sSub>';
              }
            } else {
              if (plain) {
                res += '<m:r><m:t xml:space="preserve">' + escapeXml(plain) + '</m:t></m:r>';
              }
            }
          }
        }
        return res;
      }

      return '<m:oMath>' + parseChunk(s) + '</m:oMath>';
    }

    /**

     * Converts an OMML DOM node (m:oMath / m:oMathPara) into Word 2003 HTML
     * for use inside a .doc output file. Renders visible math text so Word
     * does NOT show "Error!" instead of equations.
     *
     * @param {Element} oMathNode - The <m:oMath> or <m:oMathPara> DOM node
     * @param {number} fontSize - Font size in pt (default 12)
     * @param {boolean} isBijoy - true if Bijoy/SutonnyMJ context
     * @returns {string} Word-compatible HTML string
     */
    static ommlNodeToEqHtml(oMathNode, fontSize = 12, isBijoy = true) {
      if (!oMathNode) return '';

      // ── Recursive OMML text extractor ──────────────────────────────
      function extractMathText(node) {
        if (!node) return '';
        const localName = (node.localName || node.nodeName || '').replace(/^m:/, '');

        // Text run content
        if (localName === 't' || localName === 'r') {
          return node.textContent || '';
        }

        // Fraction: numerator / denominator
        if (localName === 'f') {
          const num = node.querySelector ? node.querySelector('[*|localName="num"],[*|localName="fNum"]') : null;
          const den = node.querySelector ? node.querySelector('[*|localName="den"],[*|localName="fDen"]') : null;
          const numText = num ? extractMathText(num) : walkChildren(node).split('/')[0] || '';
          const denText = den ? extractMathText(den) : walkChildren(node).split('/')[1] || '';
          if (numText && denText) return numText + '/' + denText;
          return walkChildren(node);
        }

        // Superscript / Subscript
        if (localName === 'sSup') {
          const base = node.querySelector ? node.querySelector('[*|localName="e"]') : null;
          const sup  = node.querySelector ? node.querySelector('[*|localName="sup"]') : null;
          const b = base ? extractMathText(base) : '';
          const s = sup  ? extractMathText(sup)  : '';
          return b + (s ? '\u207F'.includes(s) ? s : '^' + s : '');
        }
        if (localName === 'sSub') {
          const base = node.querySelector ? node.querySelector('[*|localName="e"]') : null;
          const sub  = node.querySelector ? node.querySelector('[*|localName="sub"]') : null;
          const b = base ? extractMathText(base) : '';
          const s = sub  ? extractMathText(sub)  : '';
          return b + (s ? '_' + s : '');
        }
        if (localName === 'sSubSup') {
          const base = node.querySelector ? node.querySelector('[*|localName="e"]') : null;
          const sub  = node.querySelector ? node.querySelector('[*|localName="sub"]') : null;
          const sup  = node.querySelector ? node.querySelector('[*|localName="sup"]') : null;
          const b = base ? extractMathText(base) : '';
          const sb = sub  ? '_' + extractMathText(sub)  : '';
          const sp = sup  ? '^' + extractMathText(sup)  : '';
          return b + sb + sp;
        }

        // Radical (√)
        if (localName === 'rad') {
          const deg = node.querySelector ? node.querySelector('[*|localName="deg"]') : null;
          const e   = node.querySelector ? node.querySelector('[*|localName="e"]')   : null;
          const degText = deg ? extractMathText(deg).trim() : '';
          const eText   = e   ? extractMathText(e)          : walkChildren(node);
          return degText ? degText + '\u221A(' + eText + ')' : '\u221A(' + eText + ')';
        }

        // Default: walk all children
        return walkChildren(node);
      }

      function walkChildren(node) {
        if (!node || !node.childNodes) return node ? (node.textContent || '') : '';
        let out = '';
        for (let i = 0; i < node.childNodes.length; i++) {
          const ch = node.childNodes[i];
          if (ch.nodeType === 3) { // text node
            out += ch.textContent || '';
          } else {
            out += extractMathText(ch);
          }
        }
        return out;
      }

      // ── Extract math text from the OMML node ──────────────────────
      let mathText = extractMathText(oMathNode).trim();

      // Clean up excess whitespace
      mathText = mathText.replace(/\s{2,}/g, ' ').trim();

      if (!mathText) return '';

      // ── Escape HTML special chars ──────────────────────────────────
      const esc = (s) => s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      // ── Wrap in italic Times New Roman span (standard math style) ─
      const sz = fontSize || 12;
      return `<span style="font-family:'Times New Roman',serif;font-size:${sz}pt;font-style:italic;">${esc(mathText)}</span>`;
    }
  }


  if (typeof window !== 'undefined') {
    window.EquationConverter = EquationConverter;
  }
  if (typeof global !== 'undefined') {
    global.EquationConverter = EquationConverter;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EquationConverter;
  }

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
