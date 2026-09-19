/**
 * Các kiểu dữ liệu cho pipeline xử lý toán học - KHDH AUTO V10.1
 */

export type MathDisplay = 'inline' | 'block';

export type MathNodeStatus = 
  | 'RAW' 
  | 'CANONICAL' 
  | 'KATEX_OK' 
  | 'KATEX_FAIL' 
  | 'OMML_OK' 
  | 'OMML_FAIL' 
  | 'UNSUPPORTED_COMMAND';

export interface MathNode {
  id: string;
  display: MathDisplay;
  tex: string;
  lesson_id: string;
  ppct: number;
  activity_id: string;
}

export interface MathAsset {
  id: string;
  original_tex: string;
  canonical_tex: string;
  display: MathDisplay;
  katex_html?: string;
  omml_xml?: string;
  status: MathNodeStatus;
}

export interface MathQaResult {
  remaining_math_delimiters: number;
  remaining_raw_latex: number;
  unsupported_math_commands: string[];
  failed_math_nodes: string[];
  omml_native: boolean;
  equation_as_image: boolean;
  table_overflow?: boolean;
}

export type VisualAssetType = 'tikz' | 'image_prompt';

export interface TikzAsset {
  id: string;
  type: 'tikz';
  lesson_id: string;
  ppct: number;
  activity_id: string;
  source_anchor: string;
  source: string; // mã tikz
}

export interface ImagePromptAsset {
  id: string;
  type: 'image_prompt';
  lesson_id: string;
  ppct: number;
  activity_id: string;
  source_anchor: string;
  prompt: string;
}

export type VisualAsset = TikzAsset | ImagePromptAsset;
