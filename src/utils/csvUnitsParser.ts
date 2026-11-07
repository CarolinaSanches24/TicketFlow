/**
 * Utilitários para download do modelo de CSV e importação em lote de unidades escolares.
 */

export interface ParsedUnitItem {
  unit_name: string;
  director_name: string;
  secretary_name: string;
  course_offers: string;
  status: string;
  isValid: boolean;
  error?: string;
  lineNumber: number;
}

export interface ParseResult {
  rows: ParsedUnitItem[];
  validRows: ParsedUnitItem[];
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  errors: string[];
}

/**
 * Normaliza os nomes das colunas removendo acentos, pontuações e espaços extras
 */
function normalizeHeaderName(header: string): string {
  return header
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // apenas alfanuméricos
}

/**
 * Faz o download no navegador do template de CSV de unidades escolares pré-formatado
 */
export const downloadUnitsCsvTemplate = () => {
  const headers = ['Nome da Unidade', 'Diretor(a)', 'Secretário(a)', 'Cursos Oferecidos', 'Status'];
  const sampleRows = [
    [
      'Escola Municipal Cecília Meireles',
      'Ana Paula Ribeiro',
      'Carlos Eduardo Lima',
      'Educação Infantil e Ensino Fundamental I',
      'ACTIVE'
    ],
    [
      'Colégio Estadual Santos Dumont',
      'Marcos Antônio Silva',
      'Patrícia Albuquerque',
      'Ensino Médio e Técnico em Informática',
      'ACTIVE'
    ],
    [
      'CMEI Pequenos Passos',
      'Fernanda Souza',
      'Juliana Martins',
      'Berçário e Maternal',
      'ACTIVE'
    ]
  ];

  // Montar conteúdo delimitado por ponto e vírgula (padrão de planilhas no Brasil/Excel)
  const csvLines = [
    headers.join(';'),
    ...sampleRows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(';'))
  ];

  const csvContent = csvLines.join('\r\n');

  // Adiciona o byte order mark (BOM) UTF-8 (\uFEFF) para que o Excel abra com acentos perfeitos
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'modelo_unidades_escolares.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parser de CSV tolerante a aspas, quebras de linha e delimitadores (',' ou ';')
 */
export const parseUnitsCsv = (content: string): ParseResult => {
  // Remove BOM se presente
  const cleanContent = content.replace(/^\uFEFF/, '').trim();
  if (!cleanContent) {
    return {
      rows: [],
      validRows: [],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      errors: ['O arquivo CSV fornecido está vazio.']
    };
  }

  // Detectar delimitador analisando a primeira linha
  const firstLine = cleanContent.split(/\r\n|\n|\r/)[0];
  const countSemicolon = (firstLine.match(/;/g) || []).length;
  const countComma = (firstLine.match(/,/g) || []).length;
  const delimiter = countSemicolon >= countComma ? ';' : ',';

  // Máquina de estados para parsear campos com aspas e quebras de linha
  const grid: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanContent.length; i++) {
    const char = cleanContent[i];
    const nextChar = cleanContent[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // pular aspa escapada
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // trata CRLF
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some(col => col.length > 0)) {
        grid.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Adicionar o último campo se sobrou
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(col => col.length > 0)) {
      grid.push(currentRow);
    }
  }

  if (grid.length === 0) {
    return {
      rows: [],
      validRows: [],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      errors: ['Nenhum dado legível encontrado no arquivo.']
    };
  }

  // A primeira linha é o cabeçalho
  const rawHeaders = grid[0];
  const normalizedHeaders = rawHeaders.map(h => normalizeHeaderName(h));

  // Identificação flexível das colunas
  const unitNameIdx = normalizedHeaders.findIndex(h => 
    h.includes('unidade') || h.includes('unit') || h === 'nome' || h === 'escola' || h.includes('polo')
  );
  const directorIdx = normalizedHeaders.findIndex(h => 
    h.includes('diretor') || h.includes('director') || h.includes('gestor')
  );
  const secretaryIdx = normalizedHeaders.findIndex(h => 
    h.includes('secretar') || h.includes('secretary')
  );
  const coursesIdx = normalizedHeaders.findIndex(h => 
    h.includes('curso') || h.includes('course') || h.includes('oferta')
  );
  const statusIdx = normalizedHeaders.findIndex(h => 
    h.includes('status') || h.includes('situac')
  );

  if (unitNameIdx === -1) {
    return {
      rows: [],
      validRows: [],
      totalParsed: 0,
      validCount: 0,
      invalidCount: 0,
      errors: [
        'Coluna obrigatória de "Nome da Unidade" não foi identificada no cabeçalho. Certifique-se de usar o modelo de template fornecido.'
      ]
    };
  }

  const rows: ParsedUnitItem[] = [];

  for (let r = 1; r < grid.length; r++) {
    const rawRow = grid[r];
    const unitName = (rawRow[unitNameIdx] || '').trim();
    const directorName = directorIdx !== -1 ? (rawRow[directorIdx] || '').trim() : '';
    const secretaryName = secretaryIdx !== -1 ? (rawRow[secretaryIdx] || '').trim() : '';
    const courseOffers = coursesIdx !== -1 ? (rawRow[coursesIdx] || '').trim() : '';
    const rawStatus = statusIdx !== -1 ? (rawRow[statusIdx] || '').trim().toUpperCase() : '';

    let status = 'ACTIVE';
    if (rawStatus) {
      if (rawStatus === 'INATIVO' || rawStatus === 'INATIVA' || rawStatus === 'INACTIVE') {
        status = 'INACTIVE';
      } else if (rawStatus === 'PENDENTE' || rawStatus === 'PENDING') {
        status = 'PENDING';
      } else {
        status = rawStatus;
      }
    }

    const isValid = unitName.length > 0;
    const error = !isValid ? 'Nome da unidade está vazio' : undefined;

    rows.push({
      unit_name: unitName,
      director_name: directorName,
      secretary_name: secretaryName,
      course_offers: courseOffers,
      status,
      isValid,
      error,
      lineNumber: r + 1
    });
  }

  const validRows = rows.filter(r => r.isValid);

  return {
    rows,
    validRows,
    totalParsed: rows.length,
    validCount: validRows.length,
    invalidCount: rows.length - validRows.length,
    errors: rows.length === 0 ? ['O arquivo contém apenas o cabeçalho, sem unidades para importar.'] : []
  };
};
