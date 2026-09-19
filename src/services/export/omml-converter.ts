import katex from 'katex';

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const ENTITY_MAP: Record<string, string> = {
  '&plus;': '+',
  '&minus;': '−',
  '&times;': '×',
  '&divide;': '÷',
  '&middot;': '·',
  '&leq;': '≤',
  '&le;': '≤',
  '&geq;': '≥',
  '&ge;': '≥',
  '&neq;': '≠',
  '&ne;': '≠',
  '&approx;': '≈',
  '&plusmn;': '±',
  '&in;': '∈',
  '&notin;': '∉',
  '&subset;': '⊂',
  '&subseteq;': '⊆',
  '&cup;': '∪',
  '&cap;': '∩',
  '&empty;': '∅',
  '&isin;': '∈',
  '&forall;': '∀',
  '&exist;': '∃',
  '&nabla;': '∇',
  '&part;': '∂',
  '&infin;': '∞',
  '&infty;': '∞',
  '&prop;': '∝',
  '&ang;': '∠',
  '&angle;': '∠',
  '&perp;': '⊥',
  '&parallel;': '∥',
  '&sim;': '∼',
  '&cong;': '≅',
  '&equiv;': '≡',
  '&alpha;': 'α',
  '&beta;': 'β',
  '&gamma;': 'γ',
  '&delta;': 'δ',
  '&epsilon;': 'ε',
  '&theta;': 'θ',
  '&lambda;': 'λ',
  '&mu;': 'μ',
  '&pi;': 'π',
  '&rho;': 'ρ',
  '&sigma;': 'σ',
  '&tau;': 'τ',
  '&phi;': 'φ',
  '&omega;': 'ω',
  '&Gamma;': 'Γ',
  '&Delta;': 'Δ',
  '&Theta;': 'Θ',
  '&Lambda;': 'Λ',
  '&Sigma;': 'Σ',
  '&Phi;': 'Φ',
  '&Omega;': 'Ω',
  '&rarr;': '→',
  '&larr;': '←',
  '&harr;': '↔',
  '&rArr;': '⇒',
  '&lArr;': '⇐',
  '&hArr;': '⇔',
  '&sum;': '∑',
  '&prod;': '∏',
  '&int;': '∫',
  '&iint;': '∬',
  '&iiint;': '∭',
  '&oint;': '∮',
  '&sqrt;': '√',
  '&hellip;': '…',
  '&sdot;': '⋅',
  '&prime;': '′',
  '&prime;&prime;': '″',
  '&Vert;': '‖',
  '&vert;': '|',
  '&triangle;': '△',
  '&square;': '□',
};

function decodeEntities(str: string): string {
  let res = str;
  for (const [entity, unicode] of Object.entries(ENTITY_MAP)) {
    res = res.replaceAll(entity, unicode);
  }
  res = res.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  res = res.replace(/&#([0-9]+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  return res;
}

interface MathAstNode {
  tag: string;
  attrs: Record<string, string>;
  children: MathAstNode[];
  text: string;
}

function parseXmlToAst(xmlStr: string): MathAstNode | null {
  const cleanXml = xmlStr
    .replace(/<span[^>]*>/g, '')
    .replace(/<\/span>/g, '')
    .replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '')
    .replace(/<semantics>/g, '')
    .replace(/<\/semantics>/g, '')
    .trim();

  let pos = 0;

  function parseNode(): MathAstNode | null {
    while (pos < cleanXml.length && /\s/.test(cleanXml[pos])) pos++;
    if (pos >= cleanXml.length) return null;

    if (cleanXml[pos] === '<') {
      if (cleanXml[pos + 1] === '/') {
        return null;
      }

      const endTagOpen = cleanXml.indexOf('>', pos);
      if (endTagOpen === -1) return null;

      const tagContent = cleanXml.slice(pos + 1, endTagOpen);
      const isSelfClosing = tagContent.endsWith('/');
      const tagParts = tagContent.replace(/\/$/, '').trim().split(/\s+/);
      const tagName = tagParts[0];

      const attrs: Record<string, string> = {};
      for (let i = 1; i < tagParts.length; i++) {
        const [k, v] = tagParts[i].split('=');
        if (k && v) {
          attrs[k] = v.replace(/^["']|["']$/g, '');
        }
      }

      pos = endTagOpen + 1;

      if (isSelfClosing) {
        return { tag: tagName, attrs, children: [], text: '' };
      }

      const children: MathAstNode[] = [];
      let text = '';

      while (pos < cleanXml.length) {
        if (cleanXml.startsWith(`</${tagName}>`, pos)) {
          pos += tagName.length + 3;
          break;
        }

        if (cleanXml[pos] === '<') {
          const child = parseNode();
          if (child) {
            children.push(child);
          } else {
            break;
          }
        } else {
          const nextTag = cleanXml.indexOf('<', pos);
          if (nextTag === -1) {
            text += cleanXml.slice(pos);
            pos = cleanXml.length;
          } else {
            text += cleanXml.slice(pos, nextTag);
            pos = nextTag;
          }
        }
      }

      return {
        tag: tagName,
        attrs,
        children,
        text: decodeEntities(text.trim()),
      };
    }

    return null;
  }

  return parseNode();
}

function astToOmml(node: MathAstNode | null): string {
  if (!node) return '';

  const { tag, attrs, children, text } = node;

  switch (tag) {
    case 'math':
    case 'mrow': {
      return children.map(astToOmml).join('');
    }

    case 'mi':
    case 'mn':
    case 'mo':
    case 'mtext': {
      const val = text || children.map(astToOmml).join('');
      if (!val) return '';
      const cleaned = escapeXml(val);
      return `<m:r><m:t>${cleaned}</m:t></m:r>`;
    }

    case 'mfrac': {
      const num = children[0] ? astToOmml(children[0]) : '<m:r><m:t>1</m:t></m:r>';
      const den = children[1] ? astToOmml(children[1]) : '<m:r><m:t>1</m:t></m:r>';
      return `<m:f><m:num>${num}</m:num><m:den>${den}</m:den></m:f>`;
    }

    case 'msqrt': {
      const content = children.map(astToOmml).join('');
      return `<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>${content}</m:e></m:rad>`;
    }

    case 'mroot': {
      const base = children[0] ? astToOmml(children[0]) : '';
      const deg = children[1] ? astToOmml(children[1]) : '';
      return `<m:rad><m:deg>${deg}</m:deg><m:e>${base}</m:e></m:rad>`;
    }

    case 'msup': {
      const base = children[0] ? astToOmml(children[0]) : '';
      const sup = children[1] ? astToOmml(children[1]) : '';
      return `<m:sSup><m:e>${base}</m:e><m:sup>${sup}</m:sup></m:sSup>`;
    }

    case 'msub': {
      const base = children[0] ? astToOmml(children[0]) : '';
      const sub = children[1] ? astToOmml(children[1]) : '';
      return `<m:sSub><m:e>${base}</m:e><m:sub>${sub}</m:sub></m:sSub>`;
    }

    case 'msubsup': {
      const base = children[0] ? astToOmml(children[0]) : '';
      const sub = children[1] ? astToOmml(children[1]) : '';
      const sup = children[2] ? astToOmml(children[2]) : '';
      return `<m:sSubSup><m:e>${base}</m:e><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup></m:sSubSup>`;
    }

    case 'munderover':
    case 'munder':
    case 'mover': {
      const baseNode = children[0];
      const baseText = baseNode ? (baseNode.text || '') : '';

      if (['∑', '∏', '∫', '∬', '∭', '∮', '∪', '∩'].includes(baseText)) {
        const sub = children[1] ? astToOmml(children[1]) : '';
        const sup = children[2] ? astToOmml(children[2]) : '';
        return `<m:nary><m:naryPr><m:chr m:val="${escapeXml(baseText)}"/><m:limLoc m:val="undOvr"/></m:naryPr><m:sub>${sub}</m:sub><m:sup>${sup}</m:sup><m:e></m:e></m:nary>`;
      }

      if (baseText.includes('lim')) {
        const lim = children[1] ? astToOmml(children[1]) : '';
        return `<m:limLow><m:e><m:r><m:t>lim</m:t></m:r></m:e><m:lim>${lim}</m:lim></m:limLow>`;
      }

      if (tag === 'mover') {
        const overNode = children[1];
        const overText = overNode ? (overNode.text || '') : '';
        if (overText === '→' || overText === '⃗') {
          const base = astToOmml(children[0]);
          return `<m:acc><m:accPr><m:chr m:val="→"/></m:accPr><m:e>${base}</m:e></m:acc>`;
        }
        if (overText === '¯' || overText === '—' || overText === '‾') {
          const base = astToOmml(children[0]);
          return `<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>${base}</m:e></m:bar>`;
        }
      }

      return children.map(astToOmml).join('');
    }

    case 'mtable': {
      const rows = children
        .filter((c) => c.tag === 'mtr')
        .map((row) => {
          const cols = row.children
            .filter((c) => c.tag === 'mtd')
            .map((col) => `<m:e>${col.children.map(astToOmml).join('')}</m:e>`)
            .join('');
          return `<m:mr>${cols}</m:mr>`;
        })
        .join('');

      return `<m:m><m:mPr><m:baseJc m:val="center"/><m:plcHide m:val="1"/></m:mPr>${rows}</m:m>`;
    }

    case 'mfenced': {
      const open = attrs.open || '(';
      const close = attrs.close || ')';
      const content = children.map(astToOmml).join('');
      return `<m:d><m:dPr><m:begChr m:val="${escapeXml(open)}"/><m:endChr m:val="${escapeXml(close)}"/><m:grow m:val="1"/></m:dPr><m:e>${content}</m:e></m:d>`;
    }

    default:
      return children.map(astToOmml).join('');
  }
}

export class OmmlConverter {
  /**
   * Chuyển đổi mã LaTeX sang chuỗi Office Math XML (OMML)
   */
  public static latexToOmml(latexStr: string, isDisplay = false): { omml: string; isFallback: boolean } {
    try {
      const mathml = katex.renderToString(latexStr.trim(), {
        output: 'mathml',
        throwOnError: false,
        displayMode: isDisplay,
      });

      const ast = parseXmlToAst(mathml);
      if (!ast) {
        throw new Error('Failed to parse MathML AST');
      }

      const ommlInner = astToOmml(ast);

      if (isDisplay) {
        return {
          omml: `<m:oMathPara><m:oMath>${ommlInner}</m:oMath></m:oMathPara>`,
          isFallback: false,
        };
      } else {
        return {
          omml: `<m:oMath>${ommlInner}</m:oMath>`,
          isFallback: false,
        };
      }
    } catch {
      const safeText = escapeXml(latexStr);
      if (isDisplay) {
        return {
          omml: `<m:oMathPara><m:oMath><m:r><m:t>${safeText}</m:t></m:r></m:oMath></m:oMathPara>`,
          isFallback: true,
        };
      }
      return {
        omml: `<m:oMath><m:r><m:t>${safeText}</m:t></m:r></m:oMath>`,
        isFallback: true,
      };
    }
  }
}
