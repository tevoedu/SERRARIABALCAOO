(function () {
  'use strict';

  var DB_KEY = 'assistente_serraria_local_v1';
  var page = 'inicio';
  var stockSearch = '';
  var stockFilter = 'Todos';
  var priceSearch = '';
  var priceFilter = 'Todos';
  var saleSearch = '';
  var saleShowAll = false;
  var toastTimer = null;
  var selectedReceiptIds = [];
  var historyMaterialSearch = '';
  var historyPersonSearch = '';
  var historyStartDate = '';
  var historyEndDate = '';
  var historyTypeFilter = 'Todos';
  var pendingPrintOperation = null;

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }
  function asNum(value) {
    if (typeof value === 'number') return isFinite(value) ? value : 0;
    var txt = String(value == null ? '' : value).trim().replace(/\s/g, '');
    if (!txt) return 0;
    if (txt.indexOf(',') >= 0) txt = txt.replace(/\./g, '').replace(',', '.');
    var number = Number(txt);
    return isFinite(number) ? number : 0;
  }
  function money(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0);
  }
  function qtyText(value) {
    if (value === null || value === undefined || value === '') return 'Não informado';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(Number(value) || 0);
  }
  function dateText(value, withTime) {
    if (!value) return 'Sem data';
    var date = new Date(value);
    if (isNaN(date.getTime())) return 'Sem data';
    return date.toLocaleString('pt-BR', withTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
  }
  function localDateValue(date) {
    date = date || new Date();
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  function movementDateValue(value) {
    if (!value) return '';
    var raw = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    var date = new Date(value);
    return isNaN(date.getTime()) ? '' : localDateValue(date);
  }
  function movementDateText(value) {
    var raw = movementDateValue(value);
    if (!raw) return 'Sem data';
    var parts = raw.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }
  function roundMoney(value) { return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100; }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function normalizeReceiptPrintStatus(receipt) {
    if (!receipt || typeof receipt !== 'object') return;
    receipt.printConfirmed = receipt.printConfirmed === true;
    if (receipt.printConfirmed) {
      var confirmedAt = receipt.printConfirmedAt ? new Date(receipt.printConfirmedAt) : null;
      receipt.printConfirmedAt = confirmedAt && !isNaN(confirmedAt.getTime()) ? confirmedAt.toISOString() : null;
    } else {
      receipt.printConfirmedAt = null;
    }
  }

  var stockSeeds = [
    ['s_par_01','Parafusos','PARAFUSO 1/4X3',1300,65,1235],
    ['s_par_02','Parafusos','PARAFUSO 2/4x2½',null,null,null],
    ['s_par_03','Parafusos','PARAFUSO 5/16x3',400,null,400],
    ['s_par_04','Parafusos','PARAFUSO 5/16x3½',1285,null,1285],
    ['s_par_05','Parafusos','PARAFUSO 5/16x2½',20,null,20],
    ['s_par_06','Parafusos','PARAFUSO 1/4x1½',126,12,114],
    ['s_par_07','Parafusos','PARAFUSO 3/8x5½',116,null,116],
    ['s_par_08','Parafusos','PARAFUSO 3/8x4½',40,1,39],
    ['s_par_09','Parafusos','PARAFUSO 3/4',13,null,13],
    ['s_par_10','Parafusos','PARAFUSO 1/4x2½',2000,67,1933],
    ['s_par_11','Parafusos','PARAFUSO 1/4x3 (2º registro)',1000,null,1000],
    ['s_par_12','Parafusos','PARAFUSO 1/4x3½',900,null,900],
    ['s_par_13','Parafusos','PARAFUSO 1/4x2',200,22,178],
    ['s_par_14','Parafusos','PARAFUSO 5/16x2¼',400,null,400],
    ['s_par_15','Parafusos','PARAFUSO 3/8X3',49,44,5],
    ['s_pre_01','Pregos','PREGO 2.½x10',11,null,11],
    ['s_pre_02','Pregos','PREGO 2x12',27,1,26],
    ['s_pre_03','Pregos','PREGO 1.¼x13',11,1,10],
    ['s_pre_04','Pregos','PREGO 2x10',40,null,40],
    ['s_pre_05','Pregos','PREGO 3x8',66,1,65],
    ['s_dis_01','Discos de corte','DISCO 180x1,6x22,2mm',34,null,34],
    ['s_dis_02','Discos de corte',"DISCO 12'x1/8'x1'",8,null,8],
    ['s_dis_03','Discos de corte','DISCO 180x6,4x22,2mm',5,null,5],
    ['s_por_01','Porcas','PORCA 12X8X12,8',500,null,500],
    ['s_cim_01','Cimento','CIMENTO MIZU',0,null,0],
    ['s_ara_01','Rolo de arame','ARAME 18 REFORÇADO',11,5,6],
    ['s_ara_02','Rolo de arame','ARAME 18 NORMAL',3,null,3],
    ['s_sol_01','Vareta de solda','VARETA DE SOLDA',50,40,10]
  ];
  var priceSeeds = [
    // Produtos da tabela anterior, corrigidos quando a tabela complementar esclareceu o registro.
    { id:'p_gua_01', category:'Madeira Guajará', name:'Linha Guajará — 1 m', price:33, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_gua_02', category:'Madeira Guajará', name:'Caibro Guajará — 1 m', price:6, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_gua_03', category:'Madeira Guajará', name:'Ripa Guajará — 1 m', price:3, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_gua_04', category:'Forro de madeira', name:'Forro de Guajará (60/70/80; padrão 13?)', price:140, mode:'unknown', baseQty:1, unit:'?', note:'A anotação menciona 60, 70 e 80 e “padrão 13 (?)”. Unidade de cobrança não confirmada.' },
    { id:'p_gua_05', category:'Madeira Guajará', name:'Cocheira', price:750, mode:'unit', baseQty:1, unit:'un', note:'Registro da tabela anterior; manter e conferir quando possível.' },
    { id:'p_gua_06', category:'Portas', name:'Porta comum (60/70/80)', price:220, mode:'unit', baseQty:1, unit:'un', note:'Registro anterior; diferente de Porta Paraná.' },
    { id:'p_mas_01', category:'Madeira Maçaranduba', name:'Linha Maçaranduba — 1 m', price:48, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_mas_02', category:'Madeira Maçaranduba', name:'Caibro Maçaranduba — 1 m', price:9, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_mas_03', category:'Madeira Maçaranduba', name:'Ripa Maçaranduba — 1 m', price:4.5, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_mas_04', category:'Forro de madeira', name:'Forro Maçaranduba — 60/70/80 (registro anterior)', price:160, mode:'unknown', baseQty:1, unit:'?', note:'Registro anterior: R$ 160,00 para 60/70/80. Pode ser diferente do forro sem medida especificada anotado por R$ 180,00; confirmar.' },
    { id:'p_mas_05', category:'Madeira Guajará', name:'Alisado Guajará — 1 m', price:8, mode:'meter', baseQty:1, unit:'m', note:'O preço de R$ 8,00 foi associado a Guajará na tabela complementar.' },
    { id:'p_mas_06', category:'Muiracatiara', name:'Muiracatiara — peça não identificada', price:15, mode:'unknown', baseQty:1, unit:'?', note:'A anotação informa R$ 15,00, mas não permite identificar a peça nem a unidade.' },
    { id:'p_pin_01', category:'Tábua de pinus', name:'Tábua de pinus 20 (3 m)', price:28, mode:'unit', baseQty:1, unit:'un', note:'Medida “20” preservada como anotada; unidade da medida não confirmada.' },
    { id:'p_pin_02', category:'Tábua de pinus', name:'Tábua de pinus 25 (3 m)', price:36, mode:'unit', baseQty:1, unit:'un', note:'Medida “25” preservada como anotada; unidade da medida não confirmada.' },
    { id:'p_pin_03', category:'Tábua de pinus', name:'Tábua de pinus 30 (3 m)', price:44, mode:'unit', baseQty:1, unit:'un', note:'Medida “30” preservada como anotada; unidade da medida não confirmada.' },
    { id:'p_pin_04', category:'Tábua de pinus', name:'Tábua grossa de pinus 30', price:70, mode:'unit', baseQty:1, unit:'un', note:'Registro da tabela anterior; medida/comprimento a confirmar.' },
    { id:'p_pin_05', category:'Tábua de pinus', name:'Tábua grossa de pinus 40', price:90, mode:'unit', baseQty:1, unit:'un', note:'Registro da tabela anterior; medida/comprimento a confirmar.' },
    { id:'p_pin_06', category:'Tábua de pinus', name:'Tábua de pinus 20 plainada (3 m)', price:30, mode:'unit', baseQty:1, unit:'un', note:'Medida “20” preservada como anotada; unidade da medida não confirmada.' },
    { id:'p_pin_07', category:'Tábua de pinus', name:'Tábua de pinus 25 plainada (3 m)', price:38, mode:'unit', baseQty:1, unit:'un', note:'Medida “25” preservada como anotada; unidade da medida não confirmada.' },
    { id:'p_pin_08', category:'Tábua de pinus', name:'Tábua de pinus 30 plainada (3 m)', price:46, mode:'unit', baseQty:1, unit:'un', note:'Medida “30” preservada como anotada; unidade da medida não confirmada.' },
    { id:'p_pin_09', category:'Tábua de pinus', name:'Tábua grossa de pinus 30 plainada', price:70, mode:'unit', baseQty:1, unit:'un', note:'Registro da tabela anterior; medida/comprimento a confirmar.' },
    { id:'p_pin_10', category:'Tábua de pinus', name:'Tábua grossa de pinus 40 plainada', price:90, mode:'unit', baseQty:1, unit:'un', note:'Registro da tabela anterior; medida/comprimento a confirmar.' },
    { id:'p_mui_01', category:'Tábuas especiais — registro anterior', name:'Tábua de Muiracatiara — registro anterior (1 m linear, 3,5)', price:280, mode:'unknown', baseQty:1, unit:'?', note:'O registro anterior menciona “1 m linear, 3,5”, mas a tabela complementar informa m². Confirmar se é o mesmo produto antes de usar.' },
    { id:'p_mui_02', category:'Preço antigo — identificar', name:'TANI BUQUÊ (nome a confirmar)', price:115, mode:'unknown', baseQty:1, unit:'?', note:'Registro antigo de nome incerto. Não confundir com a tábua para andaime sem confirmar.' },
    { id:'p_bar_01', category:'Barrote de pinus', name:'Barrote de pinus 6 × 6 cm (3 m)', price:28, mode:'unit', baseQty:1, unit:'un', note:'Dimensão e comprimento conforme a tabela complementar.' },
    { id:'p_bar_02', category:'Barrote de pinus', name:'Barrote de pinus 6 × 6 cm (3 m) plainado', price:30, mode:'unit', baseQty:1, unit:'un', note:'Dimensão e comprimento conforme a tabela complementar.' },
    { id:'p_mad_01', category:'Madeirite preto', name:'Madeirite preto — 10 mm', price:100, mode:'unknown', baseQty:1, unit:'?', note:'Espessura identificada; confirmar se o preço é por chapa ou outra unidade.' },
    { id:'p_mad_02', category:'Madeirite preto', name:'Madeirite preto — 12 mm', price:110, mode:'unknown', baseQty:1, unit:'?', note:'Espessura identificada; confirmar se o preço é por chapa ou outra unidade.' },

    // Complementos recebidos em 14/10/2026.
    { id:'p_mat_telha', category:'Materiais de construção', name:'Telha', price:950, mode:'thousand', baseQty:1000, unit:'unidades', note:'Preço confirmado por milheiro (1.000 unidades). Informe a quantidade em unidades, inclusive quantidades menores como 800.' },
    { id:'p_mat_tijolo', category:'Materiais de construção', name:'Tijolo (?) — tipo a confirmar', price:1200, mode:'thousand', baseQty:1000, unit:'unidades', note:'Preço confirmado por milheiro (1.000 unidades). O tipo de tijolo ainda precisa ser identificado.' },
    { id:'p_mat_areia', category:'Materiais de construção', name:'Areia — “1 m” (possivelmente m³)', price:100, mode:'unknown', baseQty:1, unit:'?', note:'A anotação pode significar 1 m³; confirmar antes de calcular vendas.' },
    { id:'p_mat_brita', category:'Materiais de construção', name:'Brita — “1 m” (possivelmente m³)', price:180, mode:'unknown', baseQty:1, unit:'?', note:'A anotação pode significar 1 m³; confirmar antes de calcular vendas.' },
    { id:'p_mat_cal', category:'Materiais de construção', name:'Cal', price:15, mode:'unknown', baseQty:1, unit:'?', note:'Unidade/embalagem não informada.' },
    { id:'p_mat_cimento', category:'Materiais de construção', name:'Cimento', price:50, mode:'unknown', baseQty:1, unit:'?', note:'Unidade/embalagem não informada.' },
    { id:'p_mat_prego', category:'Materiais de construção', name:'Prego — preço por kg', price:20, mode:'unit', baseQty:1, unit:'kg', note:'A anotação informa 1 kg por R$ 20,00.' },

    { id:'p_gua_07', category:'Madeira Guajará', name:'Barrote Guajará — 1 m', price:16.5, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_mas_07', category:'Madeira Maçaranduba', name:'Barrote Maçaranduba — 1 m', price:24, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_gua_08', category:'Madeira Guajará', name:'Madeira Guajará — nome da peça ilegível — 1 m', price:16, mode:'meter', baseQty:1, unit:'m', note:'O nome do tipo de peça não pôde ser identificado na anotação.' },
    { id:'p_mas_08', category:'Madeira Maçaranduba', name:'Madeira Maçaranduba — nome da peça ilegível — 1 m', price:28, mode:'meter', baseQty:1, unit:'m', note:'O nome do tipo de peça não pôde ser identificado na anotação.' },
    { id:'p_gua_09', category:'Madeira Guajará', name:'Assoalho Guajará — 1 m', price:58, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_mas_09', category:'Madeira Maçaranduba', name:'Assoalho Maçaranduba — 1 m', price:75, mode:'meter', baseQty:1, unit:'m', note:'' },
    { id:'p_pin_11', category:'Barrote de pinus', name:'Barrote de pinus 5 × 5 cm (3 m)', price:26, mode:'unit', baseQty:1, unit:'un', note:'Dimensão e comprimento conforme a tabela complementar.' },
    { id:'p_pin_12', category:'Barrote de pinus', name:'Barrote de pinus 5 × 5 cm (3 m) plainado', price:28, mode:'unit', baseQty:1, unit:'un', note:'Dimensão e comprimento conforme a tabela complementar.' },
    { id:'p_mad_03', category:'Portas', name:'Porta Paraná — 60 cm', price:150, mode:'unit', baseQty:1, unit:'un', note:'Preço anotado em conjunto para os tamanhos 60, 70 e 80.' },
    { id:'p_mad_04', category:'Portas', name:'Porta Paraná — 70 cm', price:150, mode:'unit', baseQty:1, unit:'un', note:'Preço anotado em conjunto para os tamanhos 60, 70 e 80.' },
    { id:'p_mad_05', category:'Portas', name:'Porta Paraná — 80 cm', price:150, mode:'unit', baseQty:1, unit:'un', note:'Preço anotado em conjunto para os tamanhos 60, 70 e 80.' },
    { id:'p_andaime_01', category:'Tábuas especiais', name:'Tábua para andaime — m²', price:115, mode:'area', baseQty:1, unit:'m²', note:'Preço informado por metro quadrado; informe comprimento e largura de cada peça.' },
    { id:'p_mui_03', category:'Tábuas especiais', name:'Tábua de Muiracatiara — m²', price:280, mode:'area', baseQty:1, unit:'m²', note:'Preço da tabela complementar por metro quadrado; informe comprimento e largura de cada peça.' },
    { id:'p_forro_mas_01', category:'Forro de madeira', name:'Forro de Maçaranduba — medida não especificada', price:180, mode:'unknown', baseQty:1, unit:'?', note:'Registro da tabela complementar: R$ 180,00. Medida e unidade de cobrança não especificadas.' },
  ];

  function createSeedDb() {
    return {
      version: 1,
      schemaVersion: 6,
      business: { name: 'Serraria São Francisco', address: '', phone: '' },
      stocks: stockSeeds.map(function (item) {
        return { id: item[0], category: item[1], name: item[2], unit: 'un', initialQty: item[3], removedLegacy: item[4], currentQty: item[5], updatedAt: null };
      }),
      prices: priceSeeds.map(function (item) {
        return Object.assign({ baseQty: 1, unit: 'un', note: '', updatedAt: null }, item);
      }),
      movements: [],
      receipts: [],
      counter: 1,
      lastBackup: null,
      draft: { customer: { name: '', cpf: '', address: '', phone: '' }, lines: [], selectedPriceId: '', showCustom: false, showCustomerDetails: false, billingMode: 'unit', generalDiscount: 0 }
    };
  }
  function loadDb() {
    try {
      var raw = localStorage.getItem(DB_KEY);
      if (!raw) return createSeedDb();
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.stocks) || !Array.isArray(parsed.prices)) return createSeedDb();
      if (!parsed.business) parsed.business = { name: 'Serraria São Francisco', address: '', phone: '' };
      if (!Array.isArray(parsed.movements)) parsed.movements = [];
      if (!Array.isArray(parsed.receipts)) parsed.receipts = [];
      parsed.receipts.forEach(normalizeReceiptPrintStatus);
      // v5: preenche campos novos nos registros antigos sem descartar nenhum movimento.
      // Se o movimento antigo não guardava o nome, usa o cadastro associado como melhor esforço.
      parsed.movements.forEach(function (movement) {
        if (!movement || typeof movement !== 'object') return;
        var linkedStock = parsed.stocks.find(function (item) { return item.id === movement.stockItemId; });
        if (!movement.itemName && linkedStock) movement.itemName = linkedStock.name;
        if (!movement.unit && linkedStock) movement.unit = linkedStock.unit || 'un';
        if (movement.responsible === undefined || movement.responsible === null) movement.responsible = '';
        if (movement.note === undefined || movement.note === null) movement.note = '';
        var dateOnly = movementDateValue(movement.date);
        if (dateOnly) movement.date = dateOnly;
      });
      if (!parsed.draft) parsed.draft = { customer: { name: '', cpf: '', address: '', phone: '' }, lines: [], selectedPriceId: '', showCustom: false, generalDiscount: 0 };
      if (parsed.draft.generalDiscount === undefined || parsed.draft.generalDiscount === null) parsed.draft.generalDiscount = 0;
      if (!parsed.draft.customer) parsed.draft.customer = { name: '', cpf: '', address: '', phone: '' };
      if (!Array.isArray(parsed.draft.lines)) parsed.draft.lines = [];
      if (typeof parsed.draft.showCustomerDetails !== 'boolean') parsed.draft.showCustomerDetails = !!(parsed.draft.customer.name || parsed.draft.customer.cpf || parsed.draft.customer.address || parsed.draft.customer.phone);
      if (!parsed.counter) parsed.counter = parsed.receipts.length + 1;
      var seeds = createSeedDb();
      seeds.stocks.forEach(function (seed) {
        if (!parsed.stocks.some(function (item) { return item.id === seed.id; })) parsed.stocks.push(seed);
      });
      seeds.prices.forEach(function (seed) {
        if (!parsed.prices.some(function (item) { return item.id === seed.id; })) parsed.prices.push(seed);
      });
      // Garante compatibilidade de campos novos sem substituir os preços que o usuário já editou.
      parsed.prices.forEach(function (item) {
        if (!item.mode) item.mode = 'unit';
        if (!item.unit) item.unit = item.mode === 'meter' || item.mode === 'base' ? 'm' : item.mode === 'thousand' ? 'unidades' : 'un';
        if (item.note === undefined) item.note = '';
        if (item.baseQty === undefined) item.baseQty = 1;
      });
      if (!parsed.schemaVersion || parsed.schemaVersion < 2) {
        var oldAlisado = parsed.prices.find(function (item) { return item.id === 'p_mas_05'; });
        if (oldAlisado) { oldAlisado.mode = 'meter'; oldAlisado.baseQty = 1; oldAlisado.unit = 'm'; }
      }
      if (!parsed.schemaVersion || parsed.schemaVersion < 3) {
        var corrections = {
          'p_gua_01': { name: 'Linha Guajará — 1 m', category: 'Madeira Guajará', mode: 'meter', baseQty: 1, unit: 'm' },
          'p_gua_02': { name: 'Caibro Guajará — 1 m', category: 'Madeira Guajará', mode: 'meter', baseQty: 1, unit: 'm' },
          'p_gua_03': { name: 'Ripa Guajará — 1 m', category: 'Madeira Guajará', mode: 'meter', baseQty: 1, unit: 'm' },
          'p_mas_01': { name: 'Linha Maçaranduba — 1 m', category: 'Madeira Maçaranduba', mode: 'meter', baseQty: 1, unit: 'm' },
          'p_mas_02': { name: 'Caibro Maçaranduba — 1 m', category: 'Madeira Maçaranduba', mode: 'meter', baseQty: 1, unit: 'm' },
          'p_mas_03': { name: 'Ripa Maçaranduba — 1 m', category: 'Madeira Maçaranduba', mode: 'meter', baseQty: 1, unit: 'm' },
          'p_mas_04': { name: 'Forro Maçaranduba — 60/70/80 (registro anterior)', category: 'Forro de madeira', mode: 'unknown', unit: '?', note: 'Registro anterior: R$ 160,00 para 60/70/80. Pode ser diferente do forro sem medida especificada anotado por R$ 180,00; confirmar.' },
          'p_mas_05': { name: 'Alisado Guajará — 1 m', category: 'Madeira Guajará', mode: 'meter', baseQty: 1, unit: 'm', note: 'O preço de R$ 8,00 foi associado a Guajará na tabela complementar.' },
          'p_mas_06': { name: 'Muiracatiara — peça não identificada', category: 'Muiracatiara', mode: 'unknown', unit: '?', note: 'A anotação informa R$ 15,00, mas não permite identificar a peça nem a unidade.' },
          'p_gua_04': { name: 'Forro de Guajará (60/70/80; padrão 13?)', category: 'Forro de madeira', mode: 'unknown', unit: '?', note: 'A anotação menciona 60, 70 e 80 e “padrão 13 (?)”. Unidade de cobrança não confirmada.' },
          'p_pin_01': { name: 'Tábua de pinus 20 (3 m)' },
          'p_pin_02': { name: 'Tábua de pinus 25 (3 m)' },
          'p_pin_03': { name: 'Tábua de pinus 30 (3 m)' },
          'p_pin_06': { name: 'Tábua de pinus 20 plainada (3 m)' },
          'p_pin_07': { name: 'Tábua de pinus 25 plainada (3 m)' },
          'p_pin_08': { name: 'Tábua de pinus 30 plainada (3 m)' },
          'p_bar_01': { name: 'Barrote de pinus 6 × 6 cm (3 m)', category: 'Barrote de pinus', mode: 'unit', unit: 'un', note: 'Dimensão e comprimento conforme a tabela complementar.' },
          'p_bar_02': { name: 'Barrote de pinus 6 × 6 cm (3 m) plainado', category: 'Barrote de pinus', mode: 'unit', unit: 'un', note: 'Dimensão e comprimento conforme a tabela complementar.' },
          'p_mui_01': { name: 'Tábua de Muiracatiara — registro anterior (1 m linear, 3,5)', category: 'Tábuas especiais — registro anterior', mode: 'unknown', unit: '?', note: 'O registro anterior menciona “1 m linear, 3,5”, mas a tabela complementar informa m². Confirmar se é o mesmo produto antes de usar.' },
          'p_mui_02': { name: 'TANI BUQUÊ (nome a confirmar)', category: 'Preço antigo — identificar', mode: 'unknown', unit: '?', note: 'Registro antigo de nome incerto. Não confundir com a tábua para andaime sem confirmar.' },
          'p_mad_01': { name: 'Madeirite preto — 10 mm', category: 'Madeirite preto', mode: 'unknown', unit: '?', note: 'Espessura identificada; confirmar se o preço é por chapa ou outra unidade.' },
          'p_mad_02': { name: 'Madeirite preto — 12 mm', category: 'Madeirite preto', mode: 'unknown', unit: '?', note: 'Espessura identificada; confirmar se o preço é por chapa ou outra unidade.' }
        };
        Object.keys(corrections).forEach(function (id) {
          var existing = parsed.prices.find(function (item) { return item.id === id; });
          if (existing) Object.keys(corrections[id]).forEach(function (key) { existing[key] = corrections[id][key]; });
        });
        parsed.schemaVersion = 3;
      }
      // v4: as unidades de telha e tijolo foram confirmadas como milheiro.
      // Preserva o preço atual caso o usuário já o tenha editado.
      if (!parsed.schemaVersion || parsed.schemaVersion < 4) {
        var milheiroNotes = {
          'p_mat_telha': 'Preço confirmado por milheiro (1.000 unidades). Informe a quantidade em unidades, inclusive quantidades menores como 800.',
          'p_mat_tijolo': 'Preço confirmado por milheiro (1.000 unidades). O tipo de tijolo ainda precisa ser identificado.'
        };
        ['p_mat_telha', 'p_mat_tijolo'].forEach(function (id) {
          var material = parsed.prices.find(function (item) { return item.id === id; });
          if (material) {
            material.mode = 'thousand';
            material.baseQty = 1000;
            material.unit = 'unidades';
            material.note = milheiroNotes[id];
          }
        });
        parsed.schemaVersion = 4;
      }
      if (!parsed.draft.billingMode) {
        var draftProduct = parsed.prices.find(function (item) { return item.id === parsed.draft.selectedPriceId; });
        parsed.draft.billingMode = !draftProduct ? 'unit' : draftProduct.mode === 'thousand' ? 'thousand' : draftProduct.mode === 'area' ? 'area' : (draftProduct.mode === 'unit' || draftProduct.mode === 'unknown') ? 'unit' : 'length';
      }
      parsed.schemaVersion = 6;
      return parsed;
    } catch (error) {
      return createSeedDb();
    }
  }
  var db = loadDb();

  function persist(silent) {
    try {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      return true;
    } catch (error) {
      if (!silent) showToast('Não consegui salvar. Faça uma cópia dos dados e libere espaço no navegador.');
      return false;
    }
  }
  persist(true);

  function showToast(message) {
    var region = document.getElementById('toast-region');
    if (!region) return;
    region.innerHTML = '<div class="toast">' + escapeHtml(message) + '</div>';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { region.innerHTML = ''; }, 3400);
  }
  function categoriesFor(list) {
    var values = [];
    list.forEach(function (item) { if (item.category && values.indexOf(item.category) === -1) values.push(item.category); });
    return values.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  }
  function priceDescription(item) {
    if (item.mode === 'unknown') return 'Unidade de cobrança a confirmar';
    if (item.mode === 'thousand') return money(item.price) + ' por milheiro (1.000 unidades)';
    if (item.mode === 'area') return money(item.price) + ' por m²';
    if (item.mode === 'meter') return money(item.price) + ' por metro';
    if (item.mode === 'base') return money(item.price) + ' a cada ' + qtyText(item.baseQty || 1) + ' m';
    return money(item.price) + ' por ' + (item.unit && item.unit !== 'un' ? item.unit : 'unidade/peça');
  }
  function chargedPriceDescription(item) {
    if (item.billingMode === 'area' || item.mode === 'area') return money(item.price) + ' por m²';
    if (item.mode === 'unknown') return 'unidade a confirmar';
    if (item.billingMode === 'thousand' || item.mode === 'thousand') return money(item.price) + ' por milheiro (1.000 unidades)';
    if (item.billingMode === 'length') {
      if (item.mode === 'base') return money(item.price) + ' a cada ' + qtyText(item.baseQty || 1) + ' m';
      return money(item.price) + ' por metro';
    }
    return money(item.price) + ' por ' + (item.unit && item.unit !== 'un' ? item.unit : 'peça/unidade');
  }
  function computeLineTotal(item, quantity, lengthPerPiece, billingMode, widthPerPiece) {
    var pieces = Number(quantity) || 0;
    var price = Number(item.price) || 0;
    var base = item.mode === 'base' ? (Number(item.baseQty) || 1) : 1;
    var raw;
    if (billingMode === 'thousand' || item.mode === 'thousand') raw = pieces * price / 1000;
    else if (billingMode === 'area' || item.mode === 'area') raw = pieces * (Number(lengthPerPiece) || 0) * (Number(widthPerPiece) || 0) * price;
    else if (billingMode === 'length') raw = pieces * (Number(lengthPerPiece) || 0) * price / base;
    else raw = pieces * price;
    return roundMoney(raw);
  }
  function lineMeasureQuantity(line) {
    var quantity = Number(line.quantity) || 0;
    if (line.billingMode === 'thousand') return quantity;
    if (line.billingMode === 'area') return quantity * (Number(line.lengthPerPiece) || 0) * (Number(line.widthPerPiece) || 0);
    if (line.billingMode === 'length') return quantity * (Number(line.lengthPerPiece) || 0);
    return quantity;
  }
  function linePricePerMeasureUnit(line) {
    var price = Number(line.price) || 0;
    if (line.billingMode === 'thousand') return price / 1000;
    if (line.billingMode === 'length' && line.mode === 'base') return price / (Number(line.baseQty) || 1);
    return price;
  }
  function lineDiscountUnitLabel(line) {
    if (line.billingMode === 'area') return 'm²';
    if (line.billingMode === 'length') return 'm';
    if (line.billingMode === 'thousand') return 'milheiro';
    return line.unit || 'un';
  }
  function lineOriginalCommercialPrice(line) {
    // No cadastro por milheiro, preço/desconto seguem por 1.000 unidades comerciais.
    return line && line.billingMode === 'thousand' ? (Number(line.price) || 0) : linePricePerMeasureUnit(line);
  }
  function lineDiscountMeasureQuantity(line) {
    return line && line.billingMode === 'thousand' ? (Number(line.quantity) || 0) / 1000 : lineMeasureQuantity(line);
  }
  function lineFinalCommercialPrice(line) {
    return roundMoney(Math.max(0, lineOriginalCommercialPrice(line) - (Number(line && line.discountPerUnit) || 0)));
  }
  function recalculateLine(line) {
    var measured = lineMeasureQuantity(line);
    var originalRate = linePricePerMeasureUnit(line);
    var discount = Math.max(0, Number(line.discountPerUnit) || 0);
    line.discountPerUnit = roundMoney(discount);
    line.subtotal = roundMoney(measured * originalRate);
    line.discountAmount = roundMoney(lineDiscountMeasureQuantity(line) * line.discountPerUnit);
    line.unitPriceFinal = lineFinalCommercialPrice(line);
    line.total = roundMoney(Math.max(0, line.subtotal - line.discountAmount));
    return line;
  }
  function getLineSubtotal(line) {
    return line && line.subtotal !== undefined ? Number(line.subtotal) || 0 : Number(line && line.total) || 0;
  }
  function getLineDiscount(line) { return Number(line && line.discountAmount) || 0; }
  function normalizeSearch(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }
  function pageHeading() {
    var titles = { inicio: 'Bom trabalho!', venda: 'Nova nota', estoque: 'Controle de estoque', historico: 'Histórico do Estoque', precos: 'Produtos e preços', arquivos: 'Notas salvas e arquivos' };
    document.getElementById('page-title').textContent = titles[page] || 'Assistente da Serraria';
    var d = new Date();
    document.getElementById('today-label').textContent = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
    document.querySelectorAll('[data-page]').forEach(function (element) {
      var active = element.getAttribute('data-page') === page;
      element.classList.toggle('active', active);
      if (active) element.setAttribute('aria-current', 'page'); else element.removeAttribute('aria-current');
    });
  }
  function navigate(nextPage) {
    if (nextPage === 'venda') { saleSearch = ''; saleShowAll = false; }
    page = nextPage;
    pageHeading();
    renderPage();
    window.scrollTo(0, 0);
  }
  function renderPage() {
    var main = document.getElementById('main-content');
    if (page === 'inicio') main.innerHTML = renderHome();
    else if (page === 'venda') main.innerHTML = renderSale();
    else if (page === 'estoque') main.innerHTML = renderStock();
    else if (page === 'historico') main.innerHTML = renderStockHistory();
    else if (page === 'precos') main.innerHTML = renderPrices();
    else main.innerHTML = renderFiles();
    if (page === 'arquivos') updateReceiptSelectionControls();
    if (page === 'venda') {
      var selectedProduct = db.prices.find(function (item) { return item.id === db.draft.selectedPriceId; });
      if (selectedProduct && !db.draft.billingMode) db.draft.billingMode = selectedProduct.mode === 'thousand' ? 'thousand' : selectedProduct.mode === 'unit' ? 'unit' : 'length';
      updateSalePreview();
      var customMode = document.getElementById('custom-mode');
      var customBase = document.getElementById('custom-base-wrap');
      var customLength = document.getElementById('custom-length-wrap');
      if (customMode && customBase) customBase.style.display = customMode.value === 'base' ? 'grid' : 'none';
      if (customMode && customLength) customLength.style.display = customMode.value === 'unit' ? 'none' : 'grid';
      updateCustomDiscountLabel();
    }
  }

  function renderHome() {
    var recent = db.receipts.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 3);
    var knownStock = db.stocks.filter(function (item) { return item.currentQty !== null && item.currentQty !== undefined; }).length;
    var lastNote = recent.length ? '<div class="history-row"><div><strong>Nota ' + escapeHtml(recent[0].number) + ' · ' + escapeHtml(recent[0].customer.name || 'Cliente não informado') + '</strong><small>' + dateText(recent[0].date, true) + '</small></div><div class="history-value">' + money(recent[0].total) + '<small><button class="text-button" data-action="print-note" data-id="' + escapeHtml(recent[0].id) + '">Abrir para imprimir</button></small></div></div>' : '<div class="empty"><strong>Nenhuma nota por aqui ainda.</strong>Quando você terminar a primeira venda pelo site, ela aparecerá aqui.</div>';
    return '<div class="page-stack dashboard">' +
      '<section class="hero"><p class="eyebrow">SEU APOIO NO BALCÃO</p><h2>Vamos deixar as contas mais leves.</h2><p>Some os pedidos sem fazer conta de cabeça, registre o estoque e tenha a planilha pronta quando a dona pedir.</p><button class="button button-light" data-action="go-sale">＋&nbsp; Fazer uma nota agora</button></section>' +
      '<section class="metric-grid"><div class="metric"><span class="metric-icon">▤</span><strong class="metric-value">' + db.stocks.length + '</strong><span class="metric-label">itens cadastrados no estoque</span></div><div class="metric"><span class="metric-icon">R$</span><strong class="metric-value">' + db.prices.length + '</strong><span class="metric-label">preços na tabela</span></div><div class="metric"><span class="metric-icon">▧</span><strong class="metric-value">' + db.receipts.length + '</strong><span class="metric-label">notas registradas neste aparelho</span></div><div class="metric"><span class="metric-icon">✓</span><strong class="metric-value">' + knownStock + '</strong><span class="metric-label">itens com saldo conhecido</span></div></section>' +
      '<section class="card"><div class="section-head"><div><h2>O que você precisa fazer?</h2><p>Atalhos grandes para agilizar o serviço.</p></div></div><div class="quick-grid"><button class="quick-action" data-page="venda"><span class="quick-icon">＋</span><span><strong>Montar uma nota</strong><small>Adicionar itens e calcular o total</small></span><span class="arrow">›</span></button><button class="quick-action" data-page="estoque"><span class="quick-icon">▤</span><span><strong>Atualizar estoque</strong><small>Registrar entrada ou saída</small></span><span class="arrow">›</span></button><button class="quick-action" data-page="historico"><span class="quick-icon">↕</span><span><strong>Histórico do estoque</strong><small>Consultar entradas e retiradas</small></span><span class="arrow">›</span></button><button class="quick-action" data-page="precos"><span class="quick-icon">R$</span><span><strong>Gerenciar produtos e preços</strong><small>Editar cadastros para novas notas</small></span><span class="arrow">›</span></button><button class="quick-action" data-page="arquivos"><span class="quick-icon">⇩</span><span><strong>Notas salvas e arquivos</strong><small>Abrir notas antigas, imprimir e fazer cópias</small></span><span class="arrow">›</span></button></div></section>' +
      '<section class="card"><div class="section-head"><div><h2>Notas recentes</h2><p>Toque em “Abrir para imprimir” para imprimir ou salvar em PDF.</p></div><button class="button button-secondary button-small" data-page="arquivos">Ver todas</button></div>' + lastNote + (recent.length > 1 ? recent.slice(1).map(function (receipt) { return '<div class="history-row"><div><strong>Nota ' + escapeHtml(receipt.number) + ' · ' + escapeHtml(receipt.customer.name || 'Cliente não informado') + '</strong><small>' + dateText(receipt.date, true) + '</small></div><div class="history-value">' + money(receipt.total) + '<small><button class="text-button" data-action="print-note" data-id="' + escapeHtml(receipt.id) + '">Abrir para imprimir</button></small></div></div>'; }).join('') : '') + '</section>' +
      '<div class="notice"><span class="notice-icon">i</span><div><strong>Importante: seus dados ficam neste navegador.</strong><br>Este site não sincroniza com outros aparelhos. Faça uma cópia de segurança em “Notas salvas e arquivos” regularmente. A planilha Excel é um arquivo para enviar à dona; ela não atualiza este site sozinha.</div></div>' +
      '</div>';
  }

  function customerField(key, label, placeholder, type) {
    var value = db.draft.customer[key] || '';
    var autocomplete = key === 'name' ? 'name' : key === 'phone' ? 'tel' : key === 'address' ? 'street-address' : 'off';
    var inputmode = key === 'phone' ? ' inputmode="tel"' : key === 'cpf' ? ' inputmode="numeric"' : '';
    return '<div class="field"><label for="customer-' + key + '">' + label + '</label><input id="customer-' + key + '" data-customer="' + key + '" type="' + (type || 'text') + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(placeholder || '') + '" autocomplete="' + autocomplete + '"' + inputmode + '></div>';
  }
  function sortedSalePrices() {
    return db.prices.slice().sort(function (a, b) {
      return (a.category + ' ' + a.name).localeCompare(b.category + ' ' + b.name, 'pt-BR');
    });
  }
  function saleProductResultsHtml() {
    var query = normalizeSearch(saleSearch);
    if (!query && !saleShowAll) return '';
    var terms = query ? query.split(/\s+/).filter(Boolean) : [];
    var items = sortedSalePrices().filter(function (item) {
      var searchable = normalizeSearch(item.name + ' ' + item.category);
      return !terms.length || terms.every(function (term) { return searchable.indexOf(term) >= 0; });
    });
    var totalMatches = items.length;
    if (!saleShowAll) items = items.slice(0, 6);
    if (!totalMatches) {
      return '<div class="sale-search-empty"><strong>Não encontrei esse produto.</strong><br>Tente outra parte do nome ou confira a escrita. Se ele realmente não estiver cadastrado, use “Adicionar item sem cadastro” mais abaixo.</div>';
    }
    return '<div class="sale-results-list" role="group" aria-label="Produtos disponíveis">' + items.map(function (item) {
      var charge = item.mode === 'unknown' ? 'Unidade a confirmar' : item.mode === 'thousand' ? 'Preço por mil unidades' : item.mode === 'area' ? 'Preço por m²' : item.mode === 'meter' ? 'Preço por metro' : item.mode === 'base' ? 'Preço por ' + qtyText(item.baseQty || 1) + ' m' : 'Preço por ' + (item.unit && item.unit !== 'un' ? item.unit : 'peça');
      return '<button type="button" class="sale-product-option" data-price-pick="' + escapeHtml(item.id) + '" aria-label="Escolher ' + escapeHtml(item.name) + ', ' + escapeHtml(money(item.price) + ', ' + charge) + '"><span class="sale-option-text"><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.category) + '</small></span><span class="sale-option-price"><strong>' + money(item.price) + '</strong><small>' + escapeHtml(charge) + '</small><span class="sale-option-action">Escolher</span></span></button>';
    }).join('') + '</div>' + (!saleShowAll && totalMatches > 6 ? '<p class="sale-result-count">Mostrando 6 de ' + totalMatches + ' produtos. Use “Ver lista completa de produtos” para ver os demais.</p>' : '');
  }
  function renderSaleProductPicker() {
    var selected = db.prices.find(function (item) { return item.id === db.draft.selectedPriceId; });
    if (selected) {
      var defaultBilling = selected.mode === 'thousand' ? 'thousand' : selected.mode === 'area' ? 'area' : selected.mode === 'unknown' ? 'unit' : selected.mode !== 'unit' ? 'length' : (db.draft.billingMode || 'unit');
      var selectedCharge = { mode: selected.mode, price: selected.price, baseQty: selected.baseQty, unit: selected.unit, billingMode: defaultBilling };
      var selectedHtml = '<div class="selected-product"><div class="selected-product-mark" aria-hidden="true">✓</div><div class="selected-product-copy"><span class="selected-product-label">Produto escolhido</span><strong>' + escapeHtml(selected.name) + '</strong><small>' + escapeHtml(selected.category) + ' · ' + escapeHtml(chargedPriceDescription(selectedCharge)) + '</small></div><button type="button" class="button button-secondary button-small" data-action="change-sale-product">Trocar produto</button></div>';
      if (selected.mode === 'unknown') {
        return selectedHtml + '<div class="notice sale-unknown-notice" role="alert"><span class="notice-icon">!</span><div><strong>Este produto ainda não pode ser usado na nota.</strong><br>Primeiro, confirme como ele é cobrado em “Produtos e preços”. ' + escapeHtml(selected.note || 'Edite o produto e escolha a unidade de cobrança antes de continuar.') + '<div class="sale-unknown-action"><button type="button" class="button button-secondary button-small" data-action="price-edit" data-id="' + escapeHtml(selected.id) + '">Corrigir unidade de cobrança</button></div></div></div>';
      }
      var canChooseLength = selected.mode === 'unit' && (!selected.unit || selected.unit === 'un');
      var billingHtml = selected.mode === 'area'
        ? '<div class="field sale-billing-field"><label>Forma de cobrança</label><div class="selected-product sale-billing-summary"><div class="selected-product-copy"><strong>Por metro quadrado (m²)</strong><small>' + money(selected.price) + ' por m²</small></div></div><span class="help" id="sale-product-help">Informe o comprimento e a largura de cada peça. O sistema calcula a área e multiplica pelo preço por m².</span></div>'
        : (canChooseLength ? '<div class="field sale-billing-field"><label for="sale-billing">Como calcular o valor?</label><select id="sale-billing"><option value="unit" ' + (defaultBilling === 'unit' ? 'selected' : '') + '>Pelo número de peças</option><option value="length" ' + (defaultBilling === 'length' ? 'selected' : '') + '>Pelo comprimento de cada peça</option></select><span class="help" id="sale-product-help">Se escolher comprimento, o preço cadastrado será considerado como preço por 1 metro. Essa escolha vale só para esta nota.</span></div>' : '<div class="field sale-billing-field"><label>Forma de cobrança</label><p class="help" id="sale-product-help">' + escapeHtml(priceDescription(selected)) + '</p></div>');
      return selectedHtml + billingHtml;
    }
    var showResults = saleShowAll || !!normalizeSearch(saleSearch);
    return '<div class="field"><label for="sale-search">Pesquisar produto pelo nome</label><input id="sale-search" type="search" inputmode="search" autocomplete="off" placeholder="Ex.: caibro, tábua, alisado…" value="' + escapeHtml(saleSearch) + '" aria-describedby="sale-search-help"><span class="help" id="sale-search-help">Digite parte do nome para pesquisar. A lista completa só aparece quando você tocar no botão abaixo.</span></div>' +
      '<div id="sale-product-results"' + (showResults ? '' : ' hidden') + '>' + (showResults ? saleProductResultsHtml() : '') + '</div>' +
      '<button type="button" class="button button-secondary button-full sale-all-toggle" data-action="show-all-sale-products">' + (saleShowAll ? 'Mostrar menos produtos' : 'Ver lista completa de produtos') + '</button>';
  }
  function renderSaleLines() {
    if (!db.draft.lines.length) return '<div class="empty sale-empty-lines"><strong>Nenhum produto adicionado ainda.</strong>Depois de escolher um produto e informar a quantidade, toque em “Adicionar produto à nota”. Os itens aparecerão aqui para conferência.</div>';
    return db.draft.lines.map(function (line, index) {
      var detail;
      if (line.billingMode === 'thousand') detail = qtyText(line.quantity) + ' unidades (' + qtyText(line.quantity / 1000) + ' milheiro)';
      else if (line.billingMode === 'area') detail = qtyText(line.quantity) + ' peça(s) × ' + qtyText(line.lengthPerPiece) + ' m × ' + qtyText(line.widthPerPiece) + ' m = ' + qtyText(lineMeasureQuantity(line)) + ' m²';
      else if (line.billingMode === 'length') detail = qtyText(line.quantity) + ' peça(s) × ' + qtyText(line.lengthPerPiece) + ' m = ' + qtyText(lineMeasureQuantity(line)) + ' m';
      else detail = qtyText(line.quantity) + ' ' + escapeHtml(line.unit || 'un');
      var originalRate = lineOriginalCommercialPrice(line);
      var discount = Number(line.discountPerUnit) || 0;
      var unitLabel = lineDiscountUnitLabel(line);
      var priceDetail = 'Preço original: ' + money(originalRate) + '/' + escapeHtml(unitLabel) + ' · Desconto: ' + money(discount) + '/' + escapeHtml(unitLabel) + ' · Preço final: ' + money(lineFinalCommercialPrice(line)) + '/' + escapeHtml(unitLabel);
      return '<article class="draft-line"><div class="draft-line-main"><span class="draft-line-title">' + escapeHtml(line.name) + '</span><span class="draft-line-detail">' + detail + '</span><span class="draft-line-detail draft-line-price-detail">' + priceDetail + '</span>' + (discount > 0 ? '<span class="draft-line-detail line-discount-detail">Desconto aplicado neste produto: ' + money(getLineDiscount(line)) + '</span>' : '') + '</div><div class="draft-line-side"><span class="draft-line-total-label">Total deste item</span><strong>' + money(line.total) + '</strong><div class="draft-line-controls"><button class="button button-secondary button-small" data-action="edit-line" data-index="' + index + '" aria-label="Editar ' + escapeHtml(line.name) + '">Editar item</button><button class="button button-danger button-small" data-action="remove-line" data-index="' + index + '" aria-label="Remover ' + escapeHtml(line.name) + '">Remover</button></div></div></article>';
    }).join('');
  }
  function renderSale() {
    var selectedProduct = db.prices.find(function (item) { return item.id === db.draft.selectedPriceId; });
    var canCalculateSelected = !!selectedProduct && selectedProduct.mode !== 'unknown';
    var selectedBilling = !selectedProduct ? 'unit' : selectedProduct.mode === 'thousand' ? 'thousand' : selectedProduct.mode === 'area' ? 'area' : selectedProduct.mode === 'unknown' ? 'unit' : selectedProduct.mode !== 'unit' ? 'length' : (db.draft.billingMode || 'unit');
    var custom = db.draft.showCustom ? '<section class="card"><div class="section-head"><div><h2>Item sem cadastro</h2><p>Use quando o produto ainda não estiver na tabela.</p></div><button class="icon-button" data-action="toggle-custom" aria-label="Fechar">×</button></div><form id="custom-line-form" data-form="custom-line"><div class="form-grid two"><div class="field"><label for="custom-name">Descrição</label><input id="custom-name" name="name" required placeholder="Ex.: madeira cortada sob medida"></div><div class="field"><label for="custom-unit">Unidade</label><select id="custom-unit" name="unit"><option value="un">Unidade</option><option value="m">Metro</option><option value="kg">Quilo</option><option value="cx">Caixa</option><option value="saco">Saco</option><option value="outro">Outra</option></select></div><div class="field"><label for="custom-qty">Quantidade de peças/unidades</label><input id="custom-qty" name="quantity" type="number" inputmode="decimal" min="0.001" step="any" value="1" required></div><div class="field"><label for="custom-price">Preço original (R$)</label><input id="custom-price" name="price" type="number" inputmode="decimal" min="0" step="0.01" required placeholder="0,00"></div><div class="field"><label id="custom-discount-unit-label" for="custom-discount-unit">Desconto por unidade (R$)</label><input id="custom-discount-unit" name="discountPerUnit" type="number" inputmode="decimal" min="0" step="0.01" value="0"><span class="help">Aplica-se somente ao item avulso desta nota.</span></div><div class="field"><label for="custom-mode">Como cobrar?</label><select id="custom-mode" name="mode"><option value="unit">Por unidade/peça</option><option value="meter">Por metro linear</option><option value="base">Por uma base de metros</option><option value="area">Por metro quadrado (m²)</option></select></div><div class="field" id="custom-base-wrap" style="display:none"><label for="custom-base">A base equivale a quantos metros?</label><input id="custom-base" name="baseQty" type="number" inputmode="decimal" min="0.001" step="any" value="1"><span class="help">Ex.: R$ 10 para cada 2 m: coloque 2.</span></div><div class="field" id="custom-length-wrap" style="display:none"><label for="custom-length">Comprimento de cada peça (m)</label><input id="custom-length" name="lengthPerPiece" type="text" inputmode="decimal" autocomplete="off" placeholder="1,25" value="1"><span class="help">Ex.: cinco peças de 1,25 m cada.</span></div><div class="field" id="custom-width-wrap" style="display:none"><label for="custom-width">Largura de cada peça (m)</label><input id="custom-width" name="widthPerPiece" type="text" inputmode="decimal" autocomplete="off" placeholder="0,30" value="1"></div></div><div class="modal-actions"><button type="button" class="button button-quiet" data-action="toggle-custom">Cancelar</button><button type="submit" class="button">Adicionar à nota</button></div></form></section>' : '';
    var qty = 1;
    return '<div class="page-stack sale-flow"><section class="hero sale-hero"><p class="eyebrow">EMISSÃO DE NOTA</p><h2>Monte a nota passo a passo.</h2><p>Escolha os produtos, confira as quantidades e os valores, preencha os dados do cliente se precisar e salve a nota.</p></section>' +
      '<section class="card sale-builder"><div class="section-head"><div><h2>1. Escolha o produto</h2><p>Pesquise pelo nome ou escolha uma sugestão da lista. O preço e a forma de cobrança aparecem em cada opção.</p></div></div>' + renderSaleProductPicker() +
      (canCalculateSelected ? '<div class="sale-step-heading"><span class="sale-step-number">2</span><div><h3>Quantidade, medidas e desconto</h3><p>Preencha os campos que aparecerem para este produto. O valor é atualizado automaticamente.</p></div></div><div class="sale-entry-fields"><div class="field"><label for="sale-quantity">' + (selectedBilling === 'thousand' ? 'Quantidade em unidades' : selectedBilling === 'area' ? 'Quantas peças?' : (selectedProduct.unit && selectedProduct.unit !== 'un' && selectedBilling === 'unit' ? 'Quantidade (' + escapeHtml(selectedProduct.unit) + ')' : 'Quantas peças?')) + '</label><input id="sale-quantity" type="number" inputmode="' + (selectedBilling === 'thousand' ? 'numeric' : 'decimal') + '" min="' + (selectedBilling === 'thousand' ? '1' : '0.001') + '" step="' + (selectedBilling === 'thousand' ? '1' : 'any') + '" value="' + qty + '"><span class="help">' + (selectedBilling === 'thousand' ? 'Informe as unidades físicas. Ex.: 800 unidades. O preço cadastrado vale para 1.000 unidades.' : selectedBilling === 'area' ? 'Informe quantas peças serão vendidas.' : selectedBilling === 'unit' && selectedProduct.unit && selectedProduct.unit !== 'un' ? 'Informe a quantidade na unidade indicada.' : 'Exemplo: 5 peças.') + '</span></div><div class="field" id="sale-length-wrap" style="display:' + (selectedBilling === 'length' || selectedBilling === 'area' ? 'grid' : 'none') + '"><label for="sale-length">Comprimento de cada peça (m)</label><input id="sale-length" type="text" inputmode="decimal" autocomplete="off" placeholder="Ex.: 1,25" value="1"><span class="help">' + (selectedBilling === 'area' ? 'Exemplo: cada peça mede 2 m de comprimento.' : 'Exemplo: 5 peças de 1,25 m cada.') + '</span></div><div class="field" id="sale-width-wrap" style="display:' + (selectedBilling === 'area' ? 'grid' : 'none') + '"><label for="sale-width">Largura de cada peça (m)</label><input id="sale-width" type="text" inputmode="decimal" autocomplete="off" placeholder="Ex.: 0,30" value="1"><span class="help">Informe em metros. Exemplo: 30 cm = 0,30 m.</span></div><div class="field"><label id="sale-discount-unit-label" for="sale-discount-unit">Desconto neste produto (R$ por unidade comercial)</label><input id="sale-discount-unit" type="number" inputmode="decimal" min="0" step="0.01" value="0"><span class="help" id="sale-discount-help">Use 0,00 se não houver desconto. O desconto vale somente para este produto nesta nota.</span></div></div><div class="sale-math-detail" id="sale-math-detail" aria-live="polite">Informe a quantidade e as medidas necessárias.</div><div class="price-preview sale-total-preview"><span>Valor deste produto</span><strong id="sale-preview">R$ 0,00</strong></div><button type="button" class="button button-full sale-add-button" data-action="add-line">＋&nbsp; Adicionar produto à nota</button>' : '') +
      '<div class="sale-custom-link"><button type="button" class="button button-secondary button-full" data-action="toggle-custom">Adicionar item sem cadastro</button><p>Use esta opção apenas quando o produto não estiver na tabela.</p></div></section>' + custom +
      '<section class="card sale-items-card"><div class="section-head"><div><h2>3. Produtos incluídos na nota</h2><p>' + db.draft.lines.length + (db.draft.lines.length === 1 ? ' produto adicionado' : ' produtos adicionados') + '. Confira quantidades, medidas e valores.</p></div>' + (db.draft.lines.length ? '<button class="button button-quiet button-small" data-action="clear-draft">Limpar itens</button>' : '') + '</div><div id="draft-lines" class="sale-items-list">' + renderSaleLines() + '</div></section>' +
      '<section class="card sale-customer-card"><div class="section-head"><div><h2>4. Dados do cliente <span class="optional-label">(opcional)</span></h2><p>Preencha se precisar identificar o cliente ou informar dados de entrega. Pode deixar em branco quando não forem necessários.</p></div></div><div class="form-grid two customer-fields">' + customerField('name','Nome do cliente','Nome completo') + customerField('cpf','CPF (opcional)','Digite o CPF','text') + customerField('phone','Telefone para contato','DDD + número','tel') + customerField('address','Endereço para entrega','Rua, número e referência') + '</div></section>' +
      '<section class="card sale-final-card"><div class="section-head"><div><h2>5. Confira o total e finalize</h2><p>Revise os valores abaixo antes de registrar a nota.</p></div></div><div class="discount-summary"><div><span>Subtotal original dos itens</span><strong>' + money(draftOriginalSubtotal()) + '</strong></div><div><span>Descontos aplicados aos produtos</span><strong>− ' + money(draftItemDiscountTotal()) + '</strong></div><div><span>Subtotal após descontos nos produtos</span><strong id="draft-subtotal">' + money(draftSubtotal()) + '</strong></div><div><span>Desconto geral na nota</span><strong id="draft-general-discount-summary">− ' + money(db.draft.generalDiscount || 0) + '</strong></div><div class="field general-discount-field"><label for="general-discount">Desconto geral na nota (R$)</label><input id="general-discount" type="number" min="0" max="' + moneyInput(draftSubtotal()) + '" step="0.01" inputmode="decimal" value="' + escapeHtml(db.draft.generalDiscount || 0) + '"><span class="help" id="general-discount-help">Reduz o subtotal uma única vez, depois dos descontos de cada produto. Digite 0,00 se não houver desconto geral.</span></div><div class="discount-final-row"><span>Total final da nota</span><strong id="draft-total">' + money(draftTotal()) + '</strong></div></div><button type="button" class="button button-full sale-complete-button" data-action="complete-note">Salvar nota</button><p class="small muted sale-final-help">A nota será registrada neste aparelho e abrirá uma pré-visualização para conferência. Para imprimir ou salvar em PDF, acesse “Notas salvas e arquivos” e abra a nota desejada.</p></section></div>';
  }

  function draftOriginalSubtotal() { return roundMoney(db.draft.lines.reduce(function (sum, line) { return sum + getLineSubtotal(line); }, 0)); }
  function draftItemDiscountTotal() { return roundMoney(db.draft.lines.reduce(function (sum, line) { return sum + getLineDiscount(line); }, 0)); }
  function draftSubtotal() { return roundMoney(db.draft.lines.reduce(function (sum, line) { return sum + (Number(line.total) || 0); }, 0)); }
  function draftTotal() { return roundMoney(Math.max(0, draftSubtotal() - (Number(db.draft.generalDiscount) || 0))); }
  function moneyInput(value) { return (Number(value) || 0).toFixed(2); }
  function filteredStock() {
    return db.stocks.filter(function (item) {
      var searchMatch = (item.name + ' ' + item.category).toLowerCase().indexOf(stockSearch.toLowerCase()) >= 0;
      return searchMatch && (stockFilter === 'Todos' || item.category === stockFilter);
    }).sort(function (a, b) { return (a.category + a.name).localeCompare(b.category + b.name, 'pt-BR'); });
  }
  function stockItemCard(item) {
    var known = item.currentQty !== null && item.currentQty !== undefined && item.currentQty !== '';
    var inventoryValue = known ? qtyText(item.currentQty) + ' ' + escapeHtml(item.unit || 'un') : 'Saldo não informado';
    var status = !known ? '<span class="pill">Cadastrar saldo</span>' : Number(item.currentQty) <= 0 ? '<span class="pill" style="background:var(--danger-soft);color:var(--danger)">Zerado</span>' : '<span class="pill pill-green">Saldo registrado</span>';
    return '<article class="item-card"><span class="item-badge">▤</span><div class="item-main"><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.category) + ' · ' + escapeHtml(item.unit || 'un') + '</small>' + status + '</div><div class="item-right"><strong>' + inventoryValue + '</strong><div class="item-controls"><button class="icon-button" data-action="stock-adjust" data-id="' + escapeHtml(item.id) + '" aria-label="Ajustar saldo de ' + escapeHtml(item.name) + '">± Ajustar</button><button class="icon-button" data-action="stock-edit" data-id="' + escapeHtml(item.id) + '" aria-label="Editar ' + escapeHtml(item.name) + '">✎</button></div></div></article>';
  }
  function renderStock() {
    var categories = categoriesFor(db.stocks);
    var chips = ['Todos'].concat(categories).map(function (category) { return '<button class="chip ' + (stockFilter === category ? 'active' : '') + '" data-stock-filter="' + escapeHtml(category) + '">' + escapeHtml(category) + '</button>'; }).join('');
    var items = filteredStock();
    return '<div class="page-stack"><section class="hero"><p class="eyebrow">ESTOQUE NA PALMA DA MÃO</p><h2>Saldo simples, sem perder tempo.</h2><p>Registre entradas e saídas. Cada movimentação fica salva no histórico com a data e o saldo correspondente.</p><button class="button button-light" data-action="stock-add">＋&nbsp; Cadastrar item de estoque</button></section>' +
      '<section class="card"><div class="section-head"><div><h2>Itens do estoque</h2><p>' + db.stocks.length + ' itens cadastrados. Os saldos vieram da planilha enviada quando estavam preenchidos.</p></div></div><div class="toolbar"><div class="search-wrap"><span class="search-symbol">⌕</span><input class="search-box" id="stock-search" type="search" placeholder="Procurar produto…" value="' + escapeHtml(stockSearch) + '"></div><button class="button button-secondary button-small" data-action="stock-add">＋ Novo item</button></div><div class="filter-row">' + chips + '</div><div id="stock-list" class="item-list">' + (items.length ? items.map(stockItemCard).join('') : '<div class="empty"><strong>Nenhum item encontrado.</strong>Tente mudar a busca ou o filtro.</div>') + '</div></section>' +
      '<div class="notice"><span class="notice-icon">i</span><div><strong>Atenção aos saldos em branco.</strong><br>Algumas linhas da planilha original não tinham quantidade preenchida. O site mantém esses saldos como “não informado”, em vez de inventar uma quantidade.</div></div></div>';
  }

  function filteredPrices() {
    return db.prices.filter(function (item) {
      return (item.name + ' ' + item.category).toLowerCase().indexOf(priceSearch.toLowerCase()) >= 0 && (priceFilter === 'Todos' || item.category === priceFilter);
    }).sort(function (a, b) { return (a.category + a.name).localeCompare(b.category + b.name, 'pt-BR'); });
  }
  function priceItemCard(item) {
    var modeLabel = item.mode === 'unknown' ? 'Unidade a confirmar' : item.mode === 'thousand' ? 'Por milheiro (1.000 unidades)' : item.mode === 'area' ? 'Por metro quadrado (m²)' : item.mode === 'meter' ? 'Por metro linear' : item.mode === 'base' ? 'Por ' + qtyText(item.baseQty || 1) + ' m' : 'Por ' + (item.unit && item.unit !== 'un' ? item.unit : 'unidade/peça');
    return '<article class="item-card price-card"><span class="item-badge">R$</span><div class="item-main"><strong>' + escapeHtml(item.name) + '</strong><small>' + escapeHtml(item.category) + '</small><span class="pill">' + escapeHtml(modeLabel) + '</span>' + (item.note ? '<small class="price-note">' + escapeHtml(item.note) + '</small>' : '') + '</div><div class="item-right"><strong>' + money(item.price) + '</strong><small>' + escapeHtml(priceDescription(item)) + '</small><div class="item-controls"><button class="icon-button" data-action="price-edit" data-id="' + escapeHtml(item.id) + '" aria-label="Editar preço de ' + escapeHtml(item.name) + '">✎ Editar</button></div></div></article>';
  }
  function renderPrices() {
    var categories = categoriesFor(db.prices);
    var chips = ['Todos'].concat(categories).map(function (category) { return '<button class="chip ' + (priceFilter === category ? 'active' : '') + '" data-price-filter="' + escapeHtml(category) + '">' + escapeHtml(category) + '</button>'; }).join('');
    var items = filteredPrices();
    return '<div class="page-stack"><section class="hero"><p class="eyebrow">CADASTRO DE PRODUTOS</p><h2>Gerencie os produtos para as próximas vendas.</h2><p>Edite nome, categoria, preço, unidade, modo de cobrança e especificações. As notas já salvas mantêm os valores originais de cada venda.</p><button class="button button-light" data-action="price-add">＋&nbsp; Cadastrar produto</button></section>' +
      '<section class="card"><div class="section-head"><div><h2>Produtos cadastrados</h2><p>Pesquise um item e escolha “Editar” para atualizar o cadastro sem alterar notas antigas.</p></div></div><div class="toolbar"><div class="search-wrap"><span class="search-symbol">⌕</span><input class="search-box" id="price-search" type="search" placeholder="Procurar produto…" value="' + escapeHtml(priceSearch) + '"></div><button class="button button-secondary button-small" data-action="price-add">＋ Novo produto</button></div><div class="filter-row">' + chips + '</div><div id="price-list" class="item-list">' + (items.length ? items.map(priceItemCard).join('') : '<div class="empty"><strong>Nenhum preço encontrado.</strong>Tente mudar a busca ou cadastre um item.</div>') + '</div></section>' +
      '<div class="notice"><span class="notice-icon">!</span><div><strong>Confira os itens marcados “Unidade a confirmar”.</strong><br>Esses produtos não entram no cálculo da nota até você confirmar se são vendidos por peça, kg, metro, m², embalagem ou outra medida. Toque em “Editar” para completar unidade e observações.</div></div></div>';
  }

  function filteredStockMovements() {
    var material = normalizeSearch(historyMaterialSearch);
    var person = normalizeSearch(historyPersonSearch);
    return db.movements.filter(function (movement) {
      var date = movementDateValue(movement.date);
      var itemName = String(movement.itemName || 'Item sem nome');
      var responsible = String(movement.responsible || '');
      var matchesDate = (!historyStartDate || (date && date >= historyStartDate)) && (!historyEndDate || (date && date <= historyEndDate));
      var matchesMaterial = !material || normalizeSearch(itemName).indexOf(material) >= 0;
      var matchesType = historyTypeFilter === 'Todos' || movement.type === historyTypeFilter;
      var matchesPerson = !person || normalizeSearch(responsible).indexOf(person) >= 0;
      return matchesDate && matchesMaterial && matchesType && matchesPerson;
    }).sort(function (a, b) {
      var dateCompare = movementDateValue(b.date).localeCompare(movementDateValue(a.date));
      if (dateCompare !== 0) return dateCompare;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }
  function stockMovementCard(movement) {
    var type = String(movement.type || 'Movimentação');
    var quantity = movement.quantity === null || movement.quantity === undefined ? 'Não informada' : qtyText(movement.quantity) + (movement.unit ? ' ' + escapeHtml(movement.unit) : '');
    var isOut = type === 'Saída';
    var beforeAfter = (movement.before !== undefined && movement.before !== null ? 'Saldo antes: ' + qtyText(movement.before) : '') + (movement.after !== undefined && movement.after !== null ? (movement.before !== undefined && movement.before !== null ? ' · ' : '') + 'depois: ' + qtyText(movement.after) : '');
    return '<article class="history-movement-card"><div class="history-movement-top"><strong>' + escapeHtml(movementDateText(movement.date)) + '</strong><span class="movement-type ' + (isOut ? 'movement-out' : type === 'Entrada' ? 'movement-in' : '') + '">' + escapeHtml(type) + '</span></div><div class="history-movement-name">' + escapeHtml(movement.itemName || 'Item sem nome') + '</div><div class="history-movement-quantity">' + (isOut ? 'Quantidade retirada: ' : type === 'Entrada' ? 'Quantidade recebida: ' : 'Quantidade movimentada: ') + '<strong>' + quantity + '</strong></div>' + (movement.responsible ? '<div class="history-movement-meta"><span>Responsável pela retirada:</span> <strong>' + escapeHtml(movement.responsible) + '</strong></div>' : '') + (beforeAfter ? '<div class="history-movement-meta">' + escapeHtml(beforeAfter) + '</div>' : '') + (movement.note ? '<div class="history-movement-note">' + escapeHtml(movement.note) + '</div>' : '') + '</article>';
  }
  function renderStockHistory() {
    var items = filteredStockMovements();
    var types = ['Todos', 'Entrada', 'Saída', 'Ajuste manual', 'Cadastro inicial'];
    return '<div class="page-stack"><section class="hero"><p class="eyebrow">CONSULTA DE MOVIMENTAÇÕES</p><h2>Saiba o que entrou e o que saiu.</h2><p>Os registros são preservados como aconteceram, mesmo que o saldo ou o nome do cadastro sejam atualizados depois.</p></section><section class="card"><div class="section-head"><div><h2>Histórico do Estoque</h2><p id="stock-history-count">' + items.length + ' movimentações encontradas · mais recentes primeiro</p></div></div><div class="form-grid two history-filters"><div class="field"><label for="history-start-date">Data inicial</label><input type="date" id="history-start-date" value="' + escapeHtml(historyStartDate) + '"></div><div class="field"><label for="history-end-date">Data final</label><input type="date" id="history-end-date" value="' + escapeHtml(historyEndDate) + '"></div><div class="field"><label for="history-material-search">Material</label><input id="history-material-search" type="search" placeholder="Buscar material…" value="' + escapeHtml(historyMaterialSearch) + '"></div><div class="field"><label for="history-type-filter">Tipo de movimentação</label><select id="history-type-filter">' + types.map(function (type) { return '<option value="' + escapeHtml(type) + '" ' + (historyTypeFilter === type ? 'selected' : '') + '>' + escapeHtml(type) + '</option>'; }).join('') + '</select></div><div class="field"><label for="history-person-search">Pessoa responsável pela retirada</label><input id="history-person-search" type="search" placeholder="Buscar nome…" value="' + escapeHtml(historyPersonSearch) + '"></div><div class="field history-filter-actions"><label>&nbsp;</label><button type="button" class="button button-secondary" data-action="clear-history-filters">Limpar filtros</button></div></div><div id="stock-history-list" class="stock-history-list">' + (items.length ? items.map(stockMovementCard).join('') : '<div class="empty"><strong>Ainda não há movimentações.</strong>Quando você registrar entradas ou saídas na tela Estoque, elas aparecerão aqui.</div>') + '</div></section><div class="notice"><span class="notice-icon">i</span><div><strong>Histórico e saldo são informações diferentes.</strong><br>Atualizar o saldo atual não apaga as movimentações anteriores. Registros antigos feitos antes do campo “responsável” continuarão disponíveis; se esse dado não foi informado na época, ele ficará em branco.</div></div></div>';
  }
  function renderFiles() {
    var receipts = db.receipts.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    var lastBackup = db.lastBackup ? 'Última cópia: ' + dateText(db.lastBackup, true) : 'Você ainda não fez uma cópia de segurança por este site.';
    var recentRows = receipts.length ? receipts.map(function (receipt) {
      normalizeReceiptPrintStatus(receipt);
      var isSelected = selectedReceiptIds.indexOf(receipt.id) !== -1;
      var confirmed = receipt.printConfirmed === true;
      var statusHtml = confirmed
        ? '<span class="receipt-print-status receipt-print-status-confirmed">✓ Impressão confirmada</span>' + (receipt.printConfirmedAt ? '<small class="receipt-print-date">Confirmada em ' + dateText(receipt.printConfirmedAt, true) + '</small>' : '<small class="receipt-print-date">Confirmação manual registrada</small>') + '<button type="button" class="text-button receipt-undo-print" data-action="undo-print-confirmation" data-id="' + escapeHtml(receipt.id) + '">Desfazer confirmação</button>'
        : '<span class="receipt-print-status receipt-print-status-pending">Não impressa</span>';
      return '<div class="history-row receipt-history-row' + (confirmed ? ' is-print-confirmed' : '') + '"><label class="receipt-select-control"><input type="checkbox" data-receipt-select data-id="' + escapeHtml(receipt.id) + '" aria-label="Selecionar nota ' + escapeHtml(receipt.number) + '" ' + (isSelected ? 'checked' : '') + '><span class="sr-only">Selecionar</span></label><div class="receipt-history-description"><strong>Nota ' + escapeHtml(receipt.number) + ' · ' + escapeHtml(receipt.customer.name || 'Cliente não informado') + '</strong><small>' + dateText(receipt.date, true) + ' · ' + receipt.lines.length + (receipt.lines.length === 1 ? ' item' : ' itens') + '</small><div class="receipt-print-status-wrap">' + statusHtml + '</div></div><div class="history-value"><strong>' + money(receipt.total) + '</strong><small><button class="button button-secondary button-small receipt-open-action" data-action="print-note" data-id="' + escapeHtml(receipt.id) + '">Abrir para imprimir / salvar PDF</button></small></div></div>';
    }).join('') : '<div class="empty"><strong>Nenhuma nota salva ainda.</strong>Depois de registrar uma venda, a nota aparecerá aqui. Você poderá abri-la para imprimir ou salvar em PDF.</div>';
    var pendingPrintBanner = pendingPrintOperation ? '<section class="notice receipt-print-pending" role="status"><span class="notice-icon">i</span><div><strong>Operação de impressão em andamento: ' + pendingPrintOperation.receiptIds.length + (pendingPrintOperation.receiptIds.length === 1 ? ' nota' : ' notas') + '.</strong><br>Quando terminar ou voltar da tela de impressão, confirme somente se concluiu a impressão ou salvou em PDF.<div class="receipt-print-pending-actions"><button type="button" class="button button-small" data-action="confirm-print-operation">Sim, confirmar impressão</button><button type="button" class="button button-secondary button-small" data-action="cancel-print-operation">Não, ainda não</button></div></div></section>' : '';
    return '<div class="page-stack"><section class="hero"><p class="eyebrow">NOTAS E ARQUIVOS</p><h2>Encontre notas, imprima e guarde cópias.</h2><p>As notas salvas ficam logo abaixo. Abra uma nota para imprimir ou salvar em PDF. Nesta mesma área, você também pode gerar a planilha e fazer cópias de segurança.</p></section>' + pendingPrintBanner +
      '<section class="card saved-receipts-card"><div class="section-head"><div><h2>Notas salvas</h2><p>' + receipts.length + (receipts.length === 1 ? ' nota registrada neste aparelho.' : ' notas registradas neste aparelho.') + ' As mais recentes aparecem primeiro.</p></div></div>' +
      (receipts.length ? '<div class="receipt-selection-toolbar"><label class="select-all-receipts"><input type="checkbox" id="select-all-receipts" data-select-all-receipts> Selecionar todas</label><div class="receipt-selection-actions"><span id="receipt-selection-count" aria-live="polite">' + selectedReceiptIds.filter(function (id) { return receipts.some(function (receipt) { return receipt.id === id; }); }).length + ' selecionada(s)</span><button type="button" class="button button-secondary button-small" id="print-selected-notes" data-action="print-selected-notes" disabled>Abrir impressão das selecionadas (0)</button></div></div><p class="small muted receipt-batch-help">Para imprimir várias notas, marque as caixas e toque no botão. Para uma só nota, use o botão ao lado do valor.</p>' : '') + recentRows + '</section>' +
      '<section class="card"><div class="section-head"><div><h2>Exportar e guardar</h2><p>Os arquivos são criados neste aparelho. Nenhum dado é enviado para um servidor.</p></div></div><div class="action-stack"><button class="button" data-action="share-xlsx">⇩&nbsp; Gerar / compartilhar Excel atualizado</button><button class="button button-secondary" data-action="backup-json">＋&nbsp; Salvar cópia de segurança (JSON)</button><button class="button button-secondary" data-action="restore-json">↥&nbsp; Restaurar uma cópia de segurança</button></div><div class="divider"></div><p class="small muted" id="backup-status">' + escapeHtml(lastBackup) + '</p><div class="notice" style="margin-top:15px"><span class="notice-icon">i</span><div><strong>Excel e cópia de segurança são diferentes.</strong><br>O Excel é uma planilha para consultar e compartilhar. O arquivo JSON guarda uma cópia completa dos dados deste site.</div></div></section>' +
      '<section class="card"><div class="section-head"><div><h2>Identificação que aparece na nota</h2><p>Você pode ajustar o nome da madeireira, endereço e WhatsApp impressos.</p></div></div><form id="business-form" data-form="business" class="business-settings"><div class="field"><label for="business-name">Nome da loja</label><input id="business-name" name="name" required value="' + escapeHtml(db.business.name || '') + '"></div><div class="field"><label for="business-address">Endereço (opcional)</label><input id="business-address" name="address" value="' + escapeHtml(db.business.address || '') + '"></div><div class="field"><label for="business-phone">WhatsApp / telefone (opcional)</label><input id="business-phone" name="phone" value="' + escapeHtml(db.business.phone || '') + '" inputmode="tel" placeholder="DDD + número do WhatsApp"><span class="help">Este número será impresso no cabeçalho do comprovante.</span></div><button type="submit" class="button">Salvar identificação</button></form></section>' +
      '<div class="notice"><span class="notice-icon">!</span><div><strong>Cuide da cópia de segurança.</strong><br>Se você limpar os dados do navegador, trocar de celular ou abrir o site em outro navegador, os dados locais podem deixar de estar disponíveis. Salve o JSON regularmente e guarde-o em um lugar seguro.</div></div><input type="file" id="restore-input" accept=".json,application/json" hidden></div>';
  }

  function updateReceiptSelectionControls() {
    var checkboxes = Array.prototype.slice.call(document.querySelectorAll('[data-receipt-select]'));
    var selectedVisible = checkboxes.filter(function (checkbox) { return checkbox.checked; }).length;
    var total = checkboxes.length;
    var count = document.getElementById('receipt-selection-count');
    var button = document.getElementById('print-selected-notes');
    var selectAll = document.getElementById('select-all-receipts');
    if (count) count.textContent = selectedVisible + (selectedVisible === 1 ? ' selecionada' : ' selecionadas');
    if (button) {
      button.disabled = selectedVisible === 0;
      button.textContent = 'Abrir impressão das selecionadas (' + selectedVisible + ')';
    }
    if (selectAll) {
      selectAll.checked = total > 0 && selectedVisible === total;
      selectAll.indeterminate = selectedVisible > 0 && selectedVisible < total;
    }
  }

  function openModal(title, subtitle, body) {
    document.getElementById('modal-root').innerHTML = '<div class="modal-backdrop" data-action="backdrop-close"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-head"><div><h2 id="modal-title">' + escapeHtml(title) + '</h2><p>' + escapeHtml(subtitle || '') + '</p></div><button type="button" class="modal-close" data-action="close-modal" aria-label="Fechar">×</button></div>' + body + '</section></div>';
    var first = document.querySelector('#modal-root input, #modal-root select, #modal-root button');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }
  function closeModal() { document.getElementById('modal-root').innerHTML = ''; }
  function stockForm(item) {
    var editing = !!item;
    var body = '<form id="stock-form" data-form="stock" data-id="' + escapeHtml(item ? item.id : '') + '"><div class="form-grid"><div class="field"><label for="stock-name">Nome do item</label><input id="stock-name" name="name" required value="' + escapeHtml(item ? item.name : '') + '" placeholder="Ex.: PARAFUSO 3/8X3"></div><div class="field"><label for="stock-category">Categoria</label><input id="stock-category" name="category" list="stock-categories" required value="' + escapeHtml(item ? item.category : '') + '" placeholder="Ex.: Parafusos"><datalist id="stock-categories">' + categoriesFor(db.stocks).map(function (cat) { return '<option value="' + escapeHtml(cat) + '">'; }).join('') + '</datalist></div><div class="row-fields"><div class="field"><label for="stock-unit">Unidade do saldo</label><select id="stock-unit" name="unit"><option value="un" ' + (!item || item.unit === 'un' ? 'selected' : '') + '>Unidade (un)</option><option value="m" ' + (item && item.unit === 'm' ? 'selected' : '') + '>Metro (m)</option><option value="kg" ' + (item && item.unit === 'kg' ? 'selected' : '') + '>Quilo (kg)</option><option value="saco" ' + (item && item.unit === 'saco' ? 'selected' : '') + '>Saco</option><option value="cx" ' + (item && item.unit === 'cx' ? 'selected' : '') + '>Caixa</option><option value="outro" ' + (item && item.unit === 'outro' ? 'selected' : '') + '>Outro</option></select></div><div class="field"><label for="stock-quantity">Saldo atual</label><input id="stock-quantity" name="quantity" type="number" inputmode="decimal" step="any" min="0" value="' + (item && item.currentQty !== null && item.currentQty !== undefined ? escapeHtml(item.currentQty) : '') + '" placeholder="Não informado"></div></div><span class="help">Deixe o saldo vazio se ainda não souber a quantidade.</span></div><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Cancelar</button><button type="submit" class="button">' + (editing ? 'Salvar alterações' : 'Cadastrar item') + '</button></div></form>';
    openModal(editing ? 'Editar item' : 'Novo item de estoque', editing ? 'Atualize nome, categoria ou saldo.' : 'Cadastre um item que não aparece na lista.', body);
  }
  function stockAdjustForm(item) {
    var known = item.currentQty !== null && item.currentQty !== undefined;
    var today = localDateValue();
    var body = '<form id="stock-adjust-form" data-form="stock-adjust" data-id="' + escapeHtml(item.id) + '"><div class="notice" style="margin-bottom:15px"><span class="notice-icon">▤</span><div><strong>' + escapeHtml(item.name) + '</strong><br>Saldo atual: ' + (known ? qtyText(item.currentQty) + ' ' + escapeHtml(item.unit || 'un') : 'não informado') + '</div></div><div class="form-grid"><div class="field"><label for="adjust-operation">O que aconteceu?</label><select name="operation" id="adjust-operation"><option value="in">Entrada no estoque</option><option value="out">Saída do estoque</option><option value="set">Definir saldo atual</option></select></div><div class="field"><label for="adjust-date">Data da movimentação</label><input name="movementDate" id="adjust-date" type="date" value="' + today + '" required></div><div class="field"><label for="adjust-quantity">Quantidade movimentada</label><input name="quantity" id="adjust-quantity" type="number" inputmode="decimal" min="0.001" step="any" required placeholder="Digite a quantidade"></div><div class="field" id="adjust-responsible-wrap" style="display:none"><label for="adjust-responsible">Pessoa responsável pela retirada</label><input name="responsible" id="adjust-responsible" autocomplete="name" placeholder="Nome de quem retirou"><span class="help">Obrigatório para registrar uma saída.</span></div><div class="field"><label for="adjust-note">Observações (opcional)</label><input name="note" id="adjust-note" placeholder="Ex.: material retirado para uma obra"></div></div><p class="small muted">A movimentação fica registrada separadamente do saldo atual. A data é salva sem horário.</p><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Cancelar</button><button type="submit" class="button">Registrar movimentação</button></div></form>';
    openModal('Movimentar estoque', 'Registre a entrada ou retirada para manter o saldo e o histórico corretos.', body);
  }
  function priceForm(item) {
    var editing = !!item;
    var mode = item ? item.mode : 'unit';
    var unit = item && item.unit ? item.unit : 'un';
    var body = '<form id="price-form" data-form="price" data-id="' + escapeHtml(item ? item.id : '') + '"><div class="form-grid"><div class="field"><label for="price-name">Nome do produto</label><input id="price-name" name="name" required value="' + escapeHtml(item ? item.name : '') + '" placeholder="Ex.: CAIBRO"></div><div class="field"><label for="price-category">Categoria / tipo de madeira</label><input id="price-category" name="category" list="price-categories" required value="' + escapeHtml(item ? item.category : '') + '" placeholder="Ex.: Maçaranduba"><datalist id="price-categories">' + categoriesFor(db.prices).map(function (cat) { return '<option value="' + escapeHtml(cat) + '">'; }).join('') + '</datalist></div><div class="field"><label for="price-value">Preço anotado (R$)</label><input id="price-value" name="price" type="number" inputmode="decimal" min="0" step="0.01" required value="' + (item ? escapeHtml(item.price) : '') + '" placeholder="0,00"></div><div class="field"><label for="price-mode">Como o cliente paga?</label><select id="price-mode" name="mode"><option value="unknown" ' + (mode === 'unknown' ? 'selected' : '') + '>Unidade ainda não confirmada</option><option value="unit" ' + (mode === 'unit' ? 'selected' : '') + '>Por unidade / peça / kg / embalagem</option><option value="thousand" ' + (mode === 'thousand' ? 'selected' : '') + '>Por milheiro (a cada 1.000 unidades)</option><option value="meter" ' + (mode === 'meter' ? 'selected' : '') + '>Por metro linear</option><option value="base" ' + (mode === 'base' ? 'selected' : '') + '>Preço por uma quantidade de metros</option><option value="area" ' + (mode === 'area' ? 'selected' : '') + '>Por metro quadrado (m²)</option></select></div><div class="field" id="price-unit-wrap"><label for="price-unit">Unidade cobrada (se for por unidade)</label><input id="price-unit" name="unit" value="' + escapeHtml(unit) + '" placeholder="Ex.: un, kg, saco, chapa"><span class="help">Ex.: R$ 20 por kg: modo “Por unidade” e unidade “kg”.</span></div><div class="field" id="price-base-wrap"><label for="price-base">A base equivale a quantos metros?</label><input id="price-base" name="baseQty" type="number" inputmode="decimal" min="0.001" step="any" value="' + (item ? escapeHtml(item.baseQty || 1) : '1') + '"><span class="help">Exemplo: R$ 10,00 por 2 metros → base 2.</span></div><div class="field"><label for="price-note">Dimensões / especificações e observações</label><textarea id="price-note" name="note" rows="3" placeholder="Ex.: 10 mm; 3 m de comprimento; detalhes de cobrança">' + escapeHtml(item && item.note ? item.note : '') + '</textarea><span class="help">Registre medidas incertas aqui para não perder a informação original.</span></div></div><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Cancelar</button><button type="submit" class="button">' + (editing ? 'Salvar preço' : 'Cadastrar preço') + '</button></div>' + (editing ? '<div class="divider"></div><button type="button" class="button button-danger button-full" data-action="price-delete" data-id="' + escapeHtml(item.id) + '">Excluir este preço</button>' : '') + '</form>';
    openModal(editing ? 'Editar preço' : 'Novo preço', 'Confirme a forma de cobrança antes de usar o produto em uma nota.', body);
    updatePriceBaseField();
  }
  function updateCustomDiscountLabel() {
    var mode = document.getElementById('custom-mode');
    var unit = document.getElementById('custom-unit');
    var label = document.getElementById('custom-discount-unit-label');
    if (!mode || !label) return;
    var unitLabel = mode.value === 'area' ? 'm²' : (mode.value === 'meter' || mode.value === 'base') ? 'm' : !unit || unit.value === 'outro' ? 'unidade comercial' : unit.value === 'un' ? 'unidade' : unit.value;
    label.textContent = 'Desconto por ' + unitLabel + ' (R$)';
  }
  function updatePriceBaseField() {
    var mode = document.getElementById('price-mode');
    var wrap = document.getElementById('price-base-wrap');
    var unitWrap = document.getElementById('price-unit-wrap');
    if (!mode) return;
    if (wrap) wrap.style.display = mode.value === 'base' ? 'grid' : 'none';
    if (unitWrap) unitWrap.style.display = mode.value === 'unit' ? 'grid' : 'none';
  }
  function saveStockForm(form) {
    var id = form.getAttribute('data-id');
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    var category = String(data.get('category') || '').trim();
    var unit = String(data.get('unit') || 'un');
    var qRaw = String(data.get('quantity') || '').trim();
    var quantity = qRaw === '' ? null : asNum(qRaw);
    if (!name || !category) return showToast('Preencha o nome e a categoria.');
    if (quantity !== null && quantity < 0) return showToast('O saldo não pode ser negativo.');
    var item = id ? db.stocks.find(function (row) { return row.id === id; }) : null;
    var now = new Date().toISOString();
    if (!item) {
      item = { id: uid('stock'), category: category, name: name, unit: unit, initialQty: quantity, removedLegacy: null, currentQty: quantity, updatedAt: now };
      db.stocks.push(item);
      if (quantity !== null) db.movements.push({ id: uid('mov'), date: localDateValue(), type: 'Cadastro inicial', stockItemId: item.id, itemName: name, unit: unit, quantity: quantity, before: null, after: quantity, responsible: '', note: 'Saldo informado no cadastro.' });
    } else {
      var before = item.currentQty;
      item.name = name; item.category = category; item.unit = unit; item.currentQty = quantity; item.updatedAt = now;
      if (before !== quantity) db.movements.push({ id: uid('mov'), date: localDateValue(), type: 'Ajuste manual', stockItemId: item.id, itemName: name, unit: unit, quantity: quantity === null ? null : Math.abs(quantity - (Number(before) || 0)), before: before, after: quantity, responsible: '', note: 'Saldo editado diretamente no cadastro.' });
    }
    persist(); closeModal(); stockSearch = ''; navigate('estoque'); showToast('Estoque salvo.');
  }
  function saveStockAdjust(form) {
    var id = form.getAttribute('data-id');
    var item = db.stocks.find(function (row) { return row.id === id; });
    if (!item) return showToast('Não encontrei esse item.');
    var data = new FormData(form);
    var operation = String(data.get('operation'));
    var quantity = asNum(data.get('quantity'));
    var note = String(data.get('note') || '').trim();
    var responsible = String(data.get('responsible') || '').trim();
    var movementDate = String(data.get('movementDate') || '').trim() || localDateValue();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(movementDate)) return showToast('Informe uma data válida para a movimentação.');
    if (!(quantity > 0)) return showToast('Digite uma quantidade maior que zero.');
    if (operation === 'out' && !responsible) return showToast('Informe a pessoa responsável pela retirada.');
    var before = item.currentQty;
    var after;
    var type;
    if (operation === 'set') { after = quantity; type = 'Ajuste manual'; }
    else if (operation === 'in') { after = (before === null || before === undefined) ? quantity : Number(before) + quantity; type = 'Entrada'; }
    else {
      if (before === null || before === undefined) return showToast('Defina um saldo conhecido antes de registrar uma saída.');
      if (quantity > Number(before)) return showToast('A saída é maior que o saldo atual. Confira a quantidade.');
      after = Number(before) - quantity; type = 'Saída';
    }
    item.currentQty = Math.round(after * 1000) / 1000;
    item.updatedAt = new Date().toISOString();
    db.movements.push({ id: uid('mov'), date: movementDate, type: type, stockItemId: item.id, itemName: item.name, unit: item.unit || 'un', quantity: quantity, before: before, after: item.currentQty, responsible: operation === 'out' ? responsible : '', note: note });
    persist(); closeModal(); navigate('estoque'); showToast('Movimentação registrada no estoque e no histórico.');
  }
  function savePriceForm(form) {
    var id = form.getAttribute('data-id');
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    var category = String(data.get('category') || '').trim();
    var price = asNum(data.get('price'));
    var mode = String(data.get('mode') || 'unit');
    var baseQty = mode === 'base' ? asNum(data.get('baseQty')) : 1;
    var unit = String(data.get('unit') || 'un').trim() || 'un';
    if (mode === 'unit' && unit === '?') unit = 'un';
    var note = String(data.get('note') || '').trim();
    if (!name || !category) return showToast('Preencha o produto e a categoria.');
    if (price < 0) return showToast('O preço não pode ser negativo.');
    if (mode === 'base' && !(baseQty > 0)) return showToast('A base precisa ser maior que zero.');
    if (mode === 'unknown') unit = '?';
    else if (mode === 'thousand') { unit = 'unidades'; baseQty = 1000; }
    else if (mode === 'area') unit = 'm²';
    else if (mode === 'meter' || mode === 'base') unit = 'm';
    var item = id ? db.prices.find(function (row) { return row.id === id; }) : null;
    if (!item) { item = { id: uid('price'), name: name, category: category, price: price, mode: mode, baseQty: baseQty, unit: unit, note: note, updatedAt: new Date().toISOString() }; db.prices.push(item); }
    else { item.name = name; item.category = category; item.price = price; item.mode = mode; item.baseQty = baseQty; item.unit = unit; item.note = note; item.updatedAt = new Date().toISOString(); }
    if (id && db.draft.selectedPriceId === id && mode !== 'unknown') db.draft.billingMode = mode === 'thousand' ? 'thousand' : mode === 'area' ? 'area' : (mode === 'unit' ? 'unit' : 'length');
    persist(); closeModal(); priceSearch = ''; navigate('precos'); showToast(mode === 'unknown' ? 'Preço salvo. Confirme a unidade antes de usar em uma nota.' : 'Preço salvo para as próximas notas.');
  }
  function addPricedLine() {
    var quantityInput = document.getElementById('sale-quantity');
    var billingInput = document.getElementById('sale-billing');
    var lengthInput = document.getElementById('sale-length');
    var widthInput = document.getElementById('sale-width');
    var discountInput = document.getElementById('sale-discount-unit');
    var product = db.prices.find(function (item) { return item.id === db.draft.selectedPriceId; });
    if (!quantityInput || !product) return showToast('Escolha um produto primeiro.');
    if (product.mode === 'unknown') return showToast('Confirme a unidade de cobrança do produto em Produtos e preços antes de adicioná-lo.');
    var quantity = asNum(quantityInput.value);
    var billingMode = product.mode === 'thousand' ? 'thousand' : product.mode === 'area' ? 'area' : (billingInput ? billingInput.value : (product.mode === 'unit' ? 'unit' : 'length'));
    var lengthPerPiece = (billingMode === 'length' || billingMode === 'area') && lengthInput ? asNum(lengthInput.value) : null;
    var widthPerPiece = billingMode === 'area' && widthInput ? asNum(widthInput.value) : null;
    var discountPerUnit = discountInput ? asNum(discountInput.value) : 0;
    if (!(quantity > 0)) return showToast('Digite a quantidade.');
    if ((billingMode === 'length' || billingMode === 'area') && !(lengthPerPiece > 0)) return showToast('Digite o comprimento de cada peça.');
    if (billingMode === 'area' && !(widthPerPiece > 0)) return showToast('Digite a largura de cada peça.');
    var line = {
      id: uid('line'), priceId: product.id, name: product.name, category: product.category,
      quantity: quantity, unit: billingMode === 'thousand' ? 'unidades' : billingMode === 'length' ? 'peças' : billingMode === 'area' ? 'peças' : (product.unit || 'un'),
      price: Number(product.price), mode: product.mode, baseQty: Number(product.baseQty) || 1,
      billingMode: billingMode, lengthPerPiece: lengthPerPiece, widthPerPiece: widthPerPiece,
      totalLength: billingMode === 'length' ? Math.round(quantity * lengthPerPiece * 1000) / 1000 : null,
      totalArea: billingMode === 'area' ? Math.round(quantity * lengthPerPiece * widthPerPiece * 10000) / 10000 : null,
      discountPerUnit: discountPerUnit
    };
    var measure = lineMeasureQuantity(line);
    if (discountPerUnit < 0 || discountPerUnit > lineOriginalCommercialPrice(line) + 0.000001) return showToast('O desconto por unidade comercial não pode superar o preço original.');
    recalculateLine(line);
    if (line.subtotal > 0 && line.discountAmount > line.subtotal) return showToast('O desconto por item não pode superar o valor original.');
    var previousBillingMode = db.draft.billingMode;
    db.draft.lines.push(line);
    db.draft.selectedPriceId = '';
    db.draft.billingMode = 'unit';
    saleSearch = '';
    saleShowAll = false;
    if (!persist()) {
      db.draft.lines.pop();
      db.draft.selectedPriceId = product.id;
      db.draft.billingMode = previousBillingMode || billingMode;
      return;
    }
    renderPage();
    showToast('Produto adicionado com sucesso!');
  }
  function addCustomLine(form) {
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    var unit = String(data.get('unit') || 'un');
    var quantity = asNum(data.get('quantity'));
    var price = asNum(data.get('price'));
    var discountPerUnit = asNum(data.get('discountPerUnit'));
    var mode = String(data.get('mode') || 'unit');
    var baseQty = mode === 'base' ? asNum(data.get('baseQty')) : 1;
    var billingMode = mode === 'unit' ? 'unit' : mode === 'area' ? 'area' : 'length';
    var lengthPerPiece = billingMode !== 'unit' ? asNum(data.get('lengthPerPiece')) : null;
    var widthPerPiece = billingMode === 'area' ? asNum(data.get('widthPerPiece')) : null;
    if (!name || !(quantity > 0)) return showToast('Preencha a descrição e uma quantidade válida.');
    if (price < 0 || discountPerUnit < 0 || (mode === 'base' && !(baseQty > 0)) || (billingMode !== 'unit' && !(lengthPerPiece > 0)) || (billingMode === 'area' && !(widthPerPiece > 0))) return showToast('Confira o preço, desconto e medidas.');
    var line = { id: uid('line'), priceId: null, name: name, category: 'Item avulso', quantity: quantity, unit: billingMode === 'length' || billingMode === 'area' ? 'peças' : unit, price: price, mode: mode, baseQty: baseQty, billingMode: billingMode, lengthPerPiece: lengthPerPiece, widthPerPiece: widthPerPiece, totalLength: billingMode === 'length' ? quantity * lengthPerPiece : null, totalArea: billingMode === 'area' ? quantity * lengthPerPiece * widthPerPiece : null, discountPerUnit: discountPerUnit };
    if (discountPerUnit > linePricePerMeasureUnit(line) + 0.000001) return showToast('O desconto por unidade não pode superar o preço original.');
    recalculateLine(line);
    db.draft.lines.push(line);
    db.draft.showCustom = false;
    persist(); renderPage(); showToast('Item avulso adicionado à nota.');
  }
  function editLineForm(index) {
    var line = db.draft.lines[Number(index)];
    if (!line) return showToast('Não encontrei esse item da nota.');
    var isArea = line.billingMode === 'area';
    var isLength = line.billingMode === 'length';
    var pricePerUnit = lineOriginalCommercialPrice(line);
    var label = lineDiscountUnitLabel(line);
    var body = '<form id="draft-line-form" data-form="draft-line" data-index="' + Number(index) + '"><div class="notice" style="margin-bottom:15px"><span class="notice-icon">i</span><div><strong>Esta edição vale somente para esta nota.</strong><br>O cadastro original do produto não será alterado.</div></div><div class="form-grid"><div class="field"><label for="draft-line-name">Descrição do item</label><input id="draft-line-name" name="name" required value="' + escapeHtml(line.name) + '"></div><div class="field"><label for="draft-line-quantity">Quantidade de peças/unidades</label><input id="draft-line-quantity" name="quantity" type="number" min="0.001" step="any" inputmode="decimal" required value="' + escapeHtml(line.quantity) + '"></div><div class="field"><label for="draft-line-price">Preço original por unidade comercial (R$)</label><input id="draft-line-price" name="price" type="number" min="0" step="0.01" inputmode="decimal" required value="' + escapeHtml(line.price) + '"><span class="help">Alterar aqui não modifica a tabela de produtos.</span></div>' + (isLength || isArea ? '<div class="field"><label for="draft-line-length">Comprimento de cada peça (m)</label><input id="draft-line-length" name="lengthPerPiece" type="number" min="0.001" step="any" inputmode="decimal" required value="' + escapeHtml(line.lengthPerPiece || '') + '"></div>' : '') + (isArea ? '<div class="field"><label for="draft-line-width">Largura de cada peça (m)</label><input id="draft-line-width" name="widthPerPiece" type="number" min="0.001" step="any" inputmode="decimal" required value="' + escapeHtml(line.widthPerPiece || '') + '"></div>' : '') + '<div class="field"><label for="draft-line-discount">Desconto por ' + escapeHtml(label) + ' (R$)</label><input id="draft-line-discount" name="discountPerUnit" type="number" min="0" step="0.01" inputmode="decimal" required value="' + escapeHtml(line.discountPerUnit || 0) + '"><span class="help">Preço original por ' + escapeHtml(label) + ': ' + money(pricePerUnit) + '.</span></div></div><div class="modal-actions"><button type="button" class="button button-quiet" data-action="close-modal">Cancelar</button><button type="submit" class="button">Salvar item nesta nota</button></div></form>';
    openModal('Editar item da nota', 'Altere quantidade, valor ou desconto deste item.', body);
  }
  function saveDraftLineForm(form) {
    var index = Number(form.getAttribute('data-index'));
    var line = db.draft.lines[index];
    if (!line) return showToast('Não encontrei esse item da nota.');
    var data = new FormData(form);
    var quantity = asNum(data.get('quantity'));
    var price = asNum(data.get('price'));
    var discount = asNum(data.get('discountPerUnit'));
    var length = line.billingMode === 'length' || line.billingMode === 'area' ? asNum(data.get('lengthPerPiece')) : null;
    var width = line.billingMode === 'area' ? asNum(data.get('widthPerPiece')) : null;
    if (!(quantity > 0) || price < 0 || discount < 0 || ((line.billingMode === 'length' || line.billingMode === 'area') && !(length > 0)) || (line.billingMode === 'area' && !(width > 0))) return showToast('Confira a quantidade, o preço, o desconto e as medidas.');
    var updated = clone(line);
    updated.name = String(data.get('name') || '').trim();
    if (!updated.name) return showToast('A descrição do item é obrigatória.');
    updated.quantity = quantity;
    updated.price = price;
    updated.lengthPerPiece = length;
    updated.widthPerPiece = width;
    updated.totalLength = updated.billingMode === 'length' ? roundMoney(quantity * length * 1000) / 1000 : null;
    updated.totalArea = updated.billingMode === 'area' ? roundMoney(quantity * length * width * 10000) / 10000 : null;
    updated.discountPerUnit = discount;
    if (discount > lineOriginalCommercialPrice(updated) + 0.000001) return showToast('O desconto por unidade comercial não pode superar o preço original.');
    recalculateLine(updated);
    db.draft.lines[index] = updated;
    persist(); closeModal(); renderPage(); showToast('Item atualizado somente nesta nota.');
  }
  function captureCustomerFields() {
    document.querySelectorAll('[data-customer]').forEach(function (input) { db.draft.customer[input.getAttribute('data-customer')] = input.value; });
  }
  function completeNote() {
    captureCustomerFields();
    if (!db.draft.lines.length) return showToast('Adicione pelo menos um item antes de salvar.');
    var generalDiscount = roundMoney(Number(db.draft.generalDiscount) || 0);
    var subtotal = draftSubtotal();
    if (generalDiscount < 0) return showToast('O desconto geral não pode ser negativo.');
    if (generalDiscount > subtotal + 0.000001) return showToast('O desconto geral não pode superar o subtotal após os descontos por produto.');
    for (var i = 0; i < db.draft.lines.length; i++) {
      var line = db.draft.lines[i];
      if ((Number(line.discountPerUnit) || 0) > lineOriginalCommercialPrice(line) + 0.000001) return showToast('Revise o desconto por unidade comercial do item “' + line.name + '”.');
    }
    var receipt = {
      id: uid('note'),
      number: String(db.counter).padStart(5, '0'),
      date: new Date().toISOString(),
      customer: clone(db.draft.customer),
      lines: clone(db.draft.lines),
      originalSubtotal: draftOriginalSubtotal(),
      itemDiscountTotal: draftItemDiscountTotal(),
      subtotal: subtotal,
      generalDiscount: generalDiscount,
      total: roundMoney(Math.max(0, subtotal - generalDiscount)),
      printConfirmed: false,
      printConfirmedAt: null
    };
    var previousCounter = db.counter;
    var previousDraft = clone(db.draft);
    db.counter += 1;
    db.receipts.push(receipt);
    db.draft = { customer: { name: '', cpf: '', address: '', phone: '' }, lines: [], selectedPriceId: '', showCustom: false, showCustomerDetails: false, billingMode: 'unit', generalDiscount: 0 };
    saleSearch = '';
    saleShowAll = false;
    if (!persist()) {
      db.receipts.pop();
      db.counter = previousCounter;
      db.draft = previousDraft;
      renderPage();
      return;
    }
    renderPage();
    openReceiptPreview(receipt);
    showToast('Nota ' + receipt.number + ' salva. Confira a pré-visualização; a impressão não foi iniciada.');
  }

  function receiptHtml(receipt, compactPreview) {
    var business = db.business || {};
    var customer = receipt.customer || {};
    var businessName = String(business.name || 'Serraria São Francisco').trim();
    var brandName = businessName.replace(/^serraria\s*/i, '').trim() || businessName;
    var businessAddress = String(business.address || 'Rua Alta Brancária, 385 · Iguatu - Ceará').trim();
    var businessPhone = String(business.phone || '').trim();
    var lineItems = receipt.lines || [];
    var rows = lineItems.map(function (line) {
      var quantityLabel = line.billingMode === 'thousand'
        ? qtyText(line.quantity) + ' un.'
        : line.billingMode === 'area' && Number(line.lengthPerPiece) > 0 && Number(line.widthPerPiece) > 0
          ? qtyText(line.quantity) + ' peça(s)'
          : line.billingMode === 'length' && Number(line.lengthPerPiece) > 0
            ? qtyText(line.quantity) + ' × ' + qtyText(line.lengthPerPiece) + ' m'
            : qtyText(line.quantity) + ' ' + (line.unit || 'un');
      var itemUnit = lineDiscountUnitLabel(line);
      var originalRate = lineOriginalCommercialPrice(line);
      var appliedDiscount = Number(line.discountPerUnit) || 0;
      var itemDiscountLabel = ' · ' + money(originalRate) + '/' + itemUnit + (appliedDiscount > 0 ? ' − ' + money(appliedDiscount) + '/' + itemUnit + ' = ' + money(Math.max(0, originalRate - appliedDiscount)) + '/' + itemUnit : '');
      return '<tr><td class="qty">' + escapeHtml(quantityLabel) + '</td><td class="description">' + escapeHtml(line.name + itemDiscountLabel) + '</td><td class="money">' + money(line.total) + '</td></tr>';
    });
    // O documento impresso mantém as dez linhas físicas; na pré-visualização exibimos somente os itens reais.
    if (compactPreview !== true) {
      var visibleRows = Math.max(10, rows.length);
      while (rows.length < visibleRows) rows.push('<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>');
    }
    var addressLine = businessAddress ? '<span>' + escapeHtml(businessAddress) + '</span>' : '';
    var contactLine = businessPhone ? '<div class="business-contact">WhatsApp: ' + escapeHtml(businessPhone) + '</div>' : '';
    var customerHtml = '<section class="customer-fields" aria-label="Dados do cliente">' +
      '<div class="customer-line"><b>Nome:</b><span>' + escapeHtml(customer.name || '') + '</span></div>' +
      '<div class="customer-line"><b>CPF:</b><span>' + escapeHtml(customer.cpf || '') + '</span></div>' +
      '<div class="customer-pair"><div class="customer-line"><b>End.:</b><span>' + escapeHtml(customer.address || '') + '</span></div><div class="customer-line"><b>Tel:</b><span>' + escapeHtml(customer.phone || '') + '</span></div></div>' +
      '</section>';
    var rowDensity = lineItems.length > 18 ? ' ultra-dense' : lineItems.length > 14 ? ' very-dense' : lineItems.length > 10 ? ' dense' : '';
    return '<article class="receipt' + rowDensity + '">' +
      '<header class="receipt-header"><div class="brand-copy"><div class="brand-strip">SERRARIA</div><h1>' + escapeHtml(brandName) + '</h1></div>' +
      '<svg class="wood-mark" viewBox="0 0 140 84" role="img" aria-label="Pilha de madeira"><polygon points="9,23 61,5 132,22 78,42" fill="#e0b17a" stroke="#9f7047" stroke-width="1.2"/><polygon points="9,23 78,42 78,63 9,43" fill="#bd8554" stroke="#9f7047" stroke-width="1.2"/><polygon points="78,42 132,22 132,43 78,63" fill="#d69d64" stroke="#9f7047" stroke-width="1.2"/><polygon points="4,35 57,17 125,35 72,54" fill="#e7bd88" stroke="#9f7047" stroke-width="1.1"/><polygon points="4,35 72,54 72,70 4,50" fill="#c68e5b" stroke="#9f7047" stroke-width="1.1"/><polygon points="72,54 125,35 125,51 72,70" fill="#d9a16a" stroke="#9f7047" stroke-width="1.1"/><path d="M15 28l48-16M18 39l45-15M80 48l42-15M80 60l42-16" stroke="#a67549" stroke-width="1.2" fill="none" opacity=".7"/></svg></header>' +
      '<div class="business-details"><strong>FRANCISCO ALDO LOPES</strong><span>CNPJ 07.682.790/0001-15 · CGF 06.009.202-6</span>' + addressLine + contactLine + '</div>' +
      '<div class="business-services">VENDAS DE MADEIRAS EM GERAL, PORTA TRABALHADA,<br>PARANÁ, VENEZIANAS, ALMOFADA E COMUM<br>TODO TIPO DE FORRAMENTO - CANCELA E COCHEIRA.</div>' +
      customerHtml +
      '<table class="receipt-items"><colgroup><col style="width:19%"><col style="width:56%"><col style="width:25%"></colgroup><thead><tr><th>Quant</th><th>Descrição</th><th class="money">Valor</th></tr></thead><tbody>' + rows.join('') + '</tbody></table>' +
      ((Number(receipt.generalDiscount) || 0) > 0 || (Number(receipt.itemDiscountTotal) || 0) > 0 ? '<div class="receipt-summary" style="font-size:5.2pt;line-height:1.05;text-align:right;margin-top:.4mm">Subtotal original ' + money(receipt.originalSubtotal === undefined ? receipt.lines.reduce(function (sum, line) { return sum + getLineSubtotal(line); }, 0) : receipt.originalSubtotal) + ' · Desc. itens ' + money(receipt.itemDiscountTotal || 0) + ' · Após desc. itens ' + money(receipt.subtotal === undefined ? receipt.lines.reduce(function (sum, line) { return sum + (Number(line.total) || 0); }, 0) : receipt.subtotal) + ' · Desc. geral ' + money(receipt.generalDiscount || 0) + '</div>' : '') +
      '<div class="receipt-total"><span></span><strong>TOTAL R$</strong><span class="total-value">' + money(receipt.total) + '</span></div>' +
      '<footer class="receipt-footer"><div class="receipt-meta">Nota ' + escapeHtml(receipt.number) + ' · ' + escapeHtml(dateText(receipt.date, false)) + '</div><div class="signature"><span></span><strong>ASSINATURA</strong></div></footer>' +
      '</article>';
  }


  function receiptPreviewHtml(receipt) {
    // Visualizador exclusivo para tela: compartilha o HTML e os dados da nota,
    // mas não inclui folha, grade, medidas de papel ou regras do documento de impressão.
    var css = '*{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;min-height:100%;font-family:Arial,Helvetica,sans-serif;color:#171717;background:#eef2ed;-webkit-text-size-adjust:100%;text-size-adjust:100%}body{overflow-x:hidden}.receipt-preview-content{width:100%;margin:0;padding:12px}.receipt-preview-page .receipt{position:static;width:100%;height:auto;min-width:0;min-height:0;overflow:visible;border:1px solid #c8d0c7;border-radius:14px;padding:clamp(14px,3.2vw,26px);display:flex;flex-direction:column;gap:0;background:#fff;font-size:14px;line-height:1.4;box-shadow:0 2px 10px rgba(24,46,32,.08)}.receipt-preview-page .receipt-header{height:auto;min-height:0;flex:0 0 auto;display:grid;grid-template-columns:minmax(0,1fr) minmax(84px,130px);gap:12px;align-items:center;margin:0 0 8px}.receipt-preview-page .brand-copy{min-width:0}.receipt-preview-page .brand-strip{height:auto;min-height:25px;padding:5px 8px;display:flex;align-items:center;justify-content:center;background:#c95d52;color:#f5ce4c;font-size:12px;line-height:1.1;font-weight:900;letter-spacing:.8px;border-radius:3px}.receipt-preview-page .brand-copy h1{margin:7px 0 0;color:#2f527e;font-size:clamp(21px,3.1vw,31px);line-height:1.12;font-weight:900;letter-spacing:-.4px;text-align:center;text-transform:uppercase;white-space:normal;overflow-wrap:anywhere}.receipt-preview-page .wood-mark{display:block;width:100%;height:auto;max-width:130px;justify-self:end}.receipt-preview-page .business-details{margin:8px 0 0;text-align:center;font-size:12px;line-height:1.4;font-weight:700;overflow-wrap:anywhere}.receipt-preview-page .business-details strong{display:block;font-size:14px;line-height:1.35;letter-spacing:.1px}.receipt-preview-page .business-details span,.receipt-preview-page .business-contact{display:block;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}.receipt-preview-page .business-contact{font-size:12px}.receipt-preview-page .business-services{margin:12px 0 16px;text-align:center;font-size:12px;line-height:1.45;font-weight:800;font-style:italic;flex:0 0 auto;overflow-wrap:anywhere}.receipt-preview-page .customer-fields{border:1px solid #454545;border-radius:7px;flex:0 0 auto;min-height:0;height:auto;margin:4px 0 12px;padding:3px;display:flex;flex-direction:column}.receipt-preview-page .customer-line{display:flex;align-items:baseline;flex-wrap:wrap;gap:5px;min-width:0;min-height:32px;flex:0 0 auto;padding:7px 8px;border-bottom:1px solid #d2d7d1;font-size:12px;line-height:1.4}.receipt-preview-page .customer-line:last-child{border-bottom:0}.receipt-preview-page .customer-line b{flex:0 0 auto;font-weight:750}.receipt-preview-page .customer-line span{display:block;min-width:0;flex:1 1 150px;overflow:visible;white-space:normal;text-overflow:clip;overflow-wrap:anywhere}.receipt-preview-page .customer-pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);min-height:0;flex:0 0 auto}.receipt-preview-page .customer-pair .customer-line:first-child{border-right:1px solid #d2d7d1}.receipt-preview-page .receipt-items{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 10px;flex:0 0 auto;height:auto;font-size:13px;line-height:1.35}.receipt-preview-page .receipt-items th,.receipt-preview-page .receipt-items td{border:1px solid #c8cec7;padding:8px 7px;vertical-align:top;text-align:left;height:auto;min-height:0;overflow:visible;white-space:normal;overflow-wrap:anywhere;word-break:normal}.receipt-preview-page .receipt-items th{height:auto;text-align:left;font-size:12px;font-weight:800;background:#f1f4ef}.receipt-preview-page .receipt-items th:first-child,.receipt-preview-page .receipt-items td.qty{text-align:center}.receipt-preview-page .receipt-items th.money,.receipt-preview-page .receipt-items td.money{text-align:right;white-space:normal;overflow-wrap:anywhere;font-size:12px;font-variant-numeric:tabular-nums}.receipt-preview-page .receipt-items td.qty{white-space:normal;text-align:center;font-size:12px}.receipt-preview-page .receipt-items td.description{white-space:normal;text-overflow:clip;overflow-wrap:anywhere}.receipt-preview-page .receipt-items .empty-row{display:none}.receipt-preview-page .receipt.dense .receipt-items,.receipt-preview-page .receipt.very-dense .receipt-items,.receipt-preview-page .receipt.ultra-dense .receipt-items{font-size:13px}.receipt-preview-page .receipt.dense .receipt-items th,.receipt-preview-page .receipt.dense .receipt-items td,.receipt-preview-page .receipt.very-dense .receipt-items th,.receipt-preview-page .receipt.very-dense .receipt-items td,.receipt-preview-page .receipt.ultra-dense .receipt-items th,.receipt-preview-page .receipt.ultra-dense .receipt-items td{height:auto;padding:8px 7px;font-size:inherit}.receipt-preview-page .receipt.dense .receipt-items td.qty,.receipt-preview-page .receipt.very-dense .receipt-items td.qty,.receipt-preview-page .receipt.ultra-dense .receipt-items td.qty{font-size:12px}.receipt-preview-page .receipt-summary{display:block;font-size:12px!important;line-height:1.45!important;text-align:right;overflow-wrap:anywhere;margin:4px 0 10px!important;padding:8px 0;border-top:1px solid #e1e5df;border-bottom:1px solid #e1e5df}.receipt-preview-page .receipt-total{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(108px,.55fr);gap:8px;height:auto;flex:0 0 auto;align-items:stretch;font-size:15px;margin:4px 0 0}.receipt-preview-page .receipt-total strong{display:flex;align-items:center;justify-content:flex-end;padding:8px 0;font-size:14px}.receipt-preview-page .total-value{display:flex;align-items:center;justify-content:center;border:1px solid #4c4c4c;border-radius:5px;font-weight:800;font-size:16px;white-space:normal;overflow-wrap:anywhere;padding:8px 6px}.receipt-preview-page .receipt-footer{position:static;left:auto;right:auto;bottom:auto;height:auto;margin-top:22px;display:flex;flex-direction:column;justify-content:flex-end;gap:10px}.receipt-preview-page .receipt-meta{text-align:left;font-size:12px;line-height:1.4}.receipt-preview-page .signature{position:static;width:min(76%,320px);margin:22px auto 2px;text-align:center;font-size:12px;line-height:1.3}.receipt-preview-page .signature span{display:block;border-top:1px solid #333;width:100%;height:8px}.receipt-preview-page .signature strong{font-weight:700;letter-spacing:.4px}@media(max-width:520px){.receipt-preview-content{padding:8px}.receipt-preview-page .receipt{padding:13px;border-radius:10px;font-size:13px}.receipt-preview-page .receipt-header{grid-template-columns:minmax(0,1fr) 72px;gap:8px}.receipt-preview-page .brand-strip{min-height:22px;font-size:10px;letter-spacing:.5px}.receipt-preview-page .brand-copy h1{font-size:clamp(19px,6vw,25px);letter-spacing:-.3px}.receipt-preview-page .wood-mark{max-width:72px}.receipt-preview-page .business-details{font-size:11px}.receipt-preview-page .business-details strong{font-size:13px}.receipt-preview-page .business-contact,.receipt-preview-page .business-services{font-size:11px}.receipt-preview-page .business-services{margin:10px 0 12px}.receipt-preview-page .customer-fields{margin-bottom:10px}.receipt-preview-page .customer-line{padding:6px;font-size:12px}.receipt-preview-page .customer-pair{grid-template-columns:minmax(0,1fr)}.receipt-preview-page .customer-pair .customer-line:first-child{border-right:0;border-bottom:1px solid #d2d7d1}.receipt-preview-page .receipt-items{font-size:12px}.receipt-preview-page .receipt-items th,.receipt-preview-page .receipt-items td{padding:7px 5px}.receipt-preview-page .receipt-items th:first-child,.receipt-preview-page .receipt-items td.qty{width:auto}.receipt-preview-page .receipt-items th.money,.receipt-preview-page .receipt-items td.money{font-size:11px}.receipt-preview-page .receipt-total{grid-template-columns:minmax(0,1fr) auto minmax(88px,.55fr);gap:5px;font-size:13px}.receipt-preview-page .receipt-total strong{font-size:12px;padding:7px 0}.receipt-preview-page .total-value{font-size:14px;padding:7px 4px}.receipt-preview-page .receipt-summary{font-size:11px!important}.receipt-preview-page .signature{width:82%}}';
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="color-scheme" content="light"><title>Pré-visualização da nota ' + escapeHtml(receipt.number) + '</title><style>' + css + '</style></head><body class="receipt-preview-page"><main class="receipt-preview-content">' + receiptHtml(receipt, true) + '</main></body></html>';
  }

  function openReceiptPreview(receipt) {
    var body = '<div class="receipt-preview-frame-wrap"><iframe id="receipt-preview-frame" title="Pré-visualização da nota ' + escapeHtml(receipt.number) + '"></iframe></div><div class="receipt-preview-footer"><p>A nota já está salva. Esta tela é somente para conferência e não inicia a impressão.</p><button type="button" class="button button-secondary button-full receipt-preview-close" data-action="close-receipt-preview"><span class="receipt-preview-close-icon" aria-hidden="true">×</span> Fechar pré-visualização</button></div>';
    openModal('Pré-visualização da nota ' + receipt.number, 'Confira o documento antes de ir à seção “Notas” para imprimir ou salvar em PDF.', body);
    var previewModal = document.querySelector('#modal-root .modal');
    if (previewModal) previewModal.classList.add('receipt-preview-modal');
    var frame = document.getElementById('receipt-preview-frame');
    if (frame) frame.srcdoc = receiptPreviewHtml(receipt);
  }

  function receiptsPrintHtml(receipts, autoPrint, operationToken) {
    var sheets = [];
    for (var start = 0; start < receipts.length; start += 4) {
      var sheetReceipts = receipts.slice(start, start + 4);
      sheets.push('<section class="sheet">' + sheetReceipts.map(receiptHtml).join('') + '</section>');
    }
    var css = '@page{size:A4 portrait;margin:5mm}*{box-sizing:border-box}html,body{margin:0;padding:0;width:100%;font-family:Arial,Helvetica,sans-serif;color:#171717;background:#ececec}.sheet{width:200mm;height:287mm;margin:0 auto 12px;padding:0;background:#fff;display:grid;grid-template-columns:99mm 99mm;grid-template-rows:142.5mm 142.5mm;gap:2mm;overflow:hidden;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}.receipt{position:relative;width:99mm;height:142.5mm;min-width:0;min-height:0;overflow:hidden;border:.28mm solid #5e5e5e;padding:1.65mm 1.75mm 1.2mm;display:flex;flex-direction:column;background:#fff;font-size:6.3pt;line-height:1.08}.receipt-header{height:15.5mm;flex:0 0 15.5mm;display:grid;grid-template-columns:minmax(0,1fr) 26mm;gap:1mm;align-items:center}.brand-copy{min-width:0}.brand-strip{height:4.7mm;padding:.15mm 1mm;display:flex;align-items:center;justify-content:center;background:#c95d52;color:#f5ce4c;font-size:10.5pt;line-height:1;font-weight:900;letter-spacing:.7pt}.brand-copy h1{margin:.55mm 0 0;color:#2f527e;font-size:15.2pt;line-height:1;font-weight:900;letter-spacing:-.3pt;text-align:center;text-transform:uppercase;white-space:nowrap}.wood-mark{display:block;width:26mm;height:16.2mm;max-width:100%}.business-details{margin-top:.35mm;text-align:center;font-size:5.45pt;line-height:1.12;font-weight:700}.business-details strong{display:block;font-size:5.9pt;line-height:1.1;letter-spacing:.1pt}.business-details span,.business-contact{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.business-contact{font-size:5.6pt}.business-services{margin:.9mm 0 3mm;text-align:center;font-size:6.2pt;line-height:1.13;font-weight:800;font-style:italic;flex:0 0 auto}.customer-fields{border:.27mm solid #333;flex:0 0 16mm;min-height:16mm;margin:2mm 0 0;display:flex;flex-direction:column}.customer-line{display:flex;align-items:center;gap:1mm;min-width:0;min-height:0;flex:1;padding:.45mm 1mm;border-bottom:.22mm solid #505050;font-size:7pt;line-height:1}.customer-line:last-child{border-bottom:0}.customer-line b{flex:0 0 auto;font-weight:700}.customer-line span{min-width:0;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.customer-pair{display:grid;grid-template-columns:1fr 1fr;min-height:0;flex:1}.customer-pair .customer-line:first-child{border-right:.22mm solid #505050}.receipt-items{width:100%;border-collapse:collapse;table-layout:fixed;margin-top:.65mm;flex:0 0 62mm;height:62mm;font-size:6.1pt;line-height:1}.receipt-items th,.receipt-items td{border:.22mm solid #4c4c4c;padding:.25mm .65mm;vertical-align:middle;text-align:left;height:5.15mm;overflow:hidden}.receipt-items th{height:6.5mm;text-align:center;font-size:7pt;font-weight:800}.receipt-items th.money,.receipt-items td.money{text-align:center;white-space:nowrap}.receipt-items td.qty{white-space:nowrap;text-align:center;font-size:5.8pt}.receipt-items td.description{white-space:nowrap;text-overflow:ellipsis}.receipt-items .empty-row td{color:transparent}.receipt.dense .receipt-items{font-size:5.6pt}.receipt.dense .receipt-items th,.receipt.dense .receipt-items td{height:3.5mm;padding:.15mm .45mm}.receipt.dense .receipt-items th{height:5.5mm}.receipt.dense .receipt-items td.qty{font-size:5.1pt}.receipt.very-dense .receipt-items th,.receipt.very-dense .receipt-items td{height:2.9mm;padding:.08mm .35mm}.receipt.very-dense .receipt-items th{height:4.8mm}.receipt.very-dense .receipt-items{font-size:4.8pt}.receipt.ultra-dense .receipt-items th,.receipt.ultra-dense .receipt-items td{height:2.35mm;padding:0 .25mm}.receipt.ultra-dense .receipt-items th{height:4mm}.receipt.ultra-dense .receipt-items{font-size:4.3pt}.receipt-total{display:grid;grid-template-columns:19% 56% 25%;height:5mm;flex:0 0 5mm;align-items:stretch;font-size:6.7pt}.receipt-total strong{display:flex;align-items:center;justify-content:flex-end;padding-right:1mm;font-size:6.7pt}.total-value{display:flex;align-items:center;justify-content:center;border: .22mm solid #4c4c4c;border-top:0;font-weight:800;font-size:7pt;white-space:nowrap}.receipt-footer{position:absolute;left:1.75mm;right:1.75mm;bottom:7mm;height:12mm;display:flex;flex-direction:column;justify-content:flex-end}.receipt-meta{text-align:left;font-size:5.2pt;line-height:1}.signature{width:76%;margin:2.3mm auto 0;text-align:center;font-size:7pt;line-height:1.1}.signature span{display:block;border-top:.22mm solid #333;width:100%;height:1.6mm}.signature strong{font-weight:700;letter-spacing:.3pt}@media screen{.sheet{box-shadow:0 2px 12px #0002}}@media print{html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.sheet{margin:0;box-shadow:none;break-after:page;page-break-after:always}.sheet:last-child{break-after:auto;page-break-after:auto}}';
    var screenPreviewCss = autoPrint ? '' : '@media screen{html,body{background:#dfe5df}.sheet{width:calc(100vw - 20px);height:auto;aspect-ratio:200/287;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:1%;padding:0;margin:10px auto;overflow:hidden}.receipt{width:auto;height:auto;aspect-ratio:99/142.5;padding:1.65mm 1.75mm 1.2mm}.receipt-header{grid-template-columns:minmax(0,1fr) 26mm}.receipt-preview-placeholder{display:none}}';
    var printScript = autoPrint ? '<script>(function(){var token="' + escapeHtml(operationToken || '') + '";window.addEventListener("afterprint",function(){try{if(window.opener)window.opener.postMessage({type:"serraria-print-afterprint",token:token},"*");}catch(e){}});window.addEventListener("load",function(){setTimeout(function(){window.print();},450);});})();</script>' : '';
    return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comprovantes - Serraria São Francisco</title><style>' + css + screenPreviewCss + '</style></head><body>' + sheets.join('') + printScript + '</body></html>';
  }

  function openPrintReceipts(receipts) {
    if (!receipts || !receipts.length) return false;
    if (pendingPrintOperation) { showToast('Já existe uma impressão aguardando confirmação. Responda à confirmação atual antes de iniciar outra.'); return null; }
    var win = window.open('', '_blank');
    if (!win) return false;
    var token = uid('printop');
    pendingPrintOperation = {
      token: token,
      receiptIds: receipts.map(function (receipt) { return receipt.id; }),
      printWindow: win,
      startedAt: Date.now(),
      sawBlur: false,
      promptShown: false
    };
    win.document.open();
    win.document.write(receiptsPrintHtml(receipts, true, token));
    win.document.close();
    if (page === 'arquivos') renderPage();
    showToast('Quando voltar da impressão, confirme se concluiu ou salvou em PDF.');
    return true;
  }

  function openPrintReceipt(receipt) {
    return openPrintReceipts([receipt]);
  }

  function printReceipt(id) {
    var receipt = db.receipts.find(function (row) { return row.id === id; });
    if (!receipt) return showToast('Não encontrei essa nota.');
    var result = openPrintReceipt(receipt);
    if (result === false) showToast('A janela de impressão não abriu. A nota continua salva: permita janelas pop-up e toque novamente em “Abrir para imprimir / salvar PDF”.');
  }

  function printSelectedReceipts() {
    var receipts = db.receipts.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).filter(function (receipt) {
      return selectedReceiptIds.indexOf(receipt.id) !== -1;
    });
    if (!receipts.length) return showToast('Marque as notas que deseja imprimir.');
    var result = openPrintReceipts(receipts);
    if (result === false) showToast('A janela de impressão não abriu. As notas continuam salvas; permita janelas pop-up e tente novamente.');
  }

  function showPrintConfirmation() {
    if (!pendingPrintOperation || pendingPrintOperation.promptShown) return;
    pendingPrintOperation.promptShown = true;
    var count = pendingPrintOperation.receiptIds.length;
    var text = count === 1 ? 'A nota selecionada foi impressa ou salva em PDF?' : 'As ' + count + ' notas selecionadas foram impressas ou salvas em PDF?';
    var body = '<div class="notice"><span class="notice-icon">?</span><div><strong>Confirmação manual</strong><br>' + text + '<p class="small muted">O navegador não consegue verificar a impressão física. Só marcaremos as notas se você confirmar.</p></div></div><div class="modal-actions"><button type="button" class="button" data-action="confirm-print-operation">Sim, confirmar impressão</button><button type="button" class="button button-secondary" data-action="cancel-print-operation">Não, ainda não</button></div>';
    openModal('Você concluiu a impressão?', 'A janela de impressão foi fechada ou você voltou ao aplicativo.', body);
  }

  function finishPrintOperation(confirmed) {
    if (!pendingPrintOperation) { closeModal(); return; }
    var operation = pendingPrintOperation;
    if (!confirmed) {
      pendingPrintOperation = null;
      closeModal();
      if (page === 'arquivos') renderPage();
      showToast('Confirmação cancelada. O status das notas não foi alterado.');
      return;
    }
    var updates = [];
    operation.receiptIds.forEach(function (receiptId) {
      var receipt = db.receipts.find(function (item) { return item.id === receiptId; });
      if (!receipt) return;
      updates.push({ receipt: receipt, printConfirmed: receipt.printConfirmed, printConfirmedAt: receipt.printConfirmedAt });
      receipt.printConfirmed = true;
      receipt.printConfirmedAt = new Date().toISOString();
    });
    if (!persist()) {
      updates.forEach(function (update) {
        if (update.printConfirmed === undefined) delete update.receipt.printConfirmed;
        else update.receipt.printConfirmed = update.printConfirmed;
        if (update.printConfirmedAt === undefined) delete update.receipt.printConfirmedAt;
        else update.receipt.printConfirmedAt = update.printConfirmedAt;
      });
      pendingPrintOperation = null;
      closeModal();
      if (page === 'arquivos') renderPage();
      showToast('Não consegui guardar a confirmação. O status anterior foi mantido. Faça uma cópia de segurança e tente novamente.');
      return;
    }
    var confirmedCount = updates.length;
    pendingPrintOperation = null;
    closeModal();
    if (page === 'arquivos') renderPage(); else if (page === 'inicio') renderPage();
    showToast(confirmedCount === 1 ? 'Impressão confirmada para 1 nota.' : 'Impressão confirmada para ' + confirmedCount + ' notas.');
  }

  function undoPrintConfirmation(id) {
    var receipt = db.receipts.find(function (item) { return item.id === id; });
    if (!receipt || receipt.printConfirmed !== true) return;
    if (!window.confirm('Desfazer a confirmação de impressão da nota ' + receipt.number + '?')) return;
    var oldConfirmed = receipt.printConfirmed;
    var oldDate = receipt.printConfirmedAt;
    receipt.printConfirmed = false;
    receipt.printConfirmedAt = null;
    if (!persist()) {
      receipt.printConfirmed = oldConfirmed;
      if (oldDate === undefined) delete receipt.printConfirmedAt; else receipt.printConfirmedAt = oldDate;
      return;
    }
    renderPage();
    showToast('A nota voltou ao estado “Não impressa”.');
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function backupJson() {
    db.lastBackup = new Date().toISOString();
    persist();
    var backup = clone(db);
    backup.receipts.forEach(function (receipt) { normalizeReceiptPrintStatus(receipt); if (receipt && typeof receipt === 'object' && receipt.printConfirmedAt === undefined) receipt.printConfirmedAt = null; });
    var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, 'backup-serraria-' + new Date().toISOString().slice(0,10) + '.json');
    renderPage(); showToast('Cópia de segurança criada. Guarde esse arquivo.');
  }
  function restoreJsonFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var restored = JSON.parse(String(reader.result || ''));
        if (!restored || !Array.isArray(restored.stocks) || !Array.isArray(restored.prices) || !Array.isArray(restored.receipts)) throw new Error('Formato incompatível');
        if (!window.confirm('Restaurar esta cópia vai substituir os dados atuais neste aparelho. Deseja continuar?')) return;
        restored.version = 1;
        if (!restored.business) restored.business = { name: 'Serraria São Francisco', address: '', phone: '' };
        if (!Array.isArray(restored.movements)) restored.movements = [];
        restored.receipts.forEach(normalizeReceiptPrintStatus);
        if (!restored.draft) restored.draft = { customer: { name: '', cpf: '', address: '', phone: '' }, lines: [], selectedPriceId: '', showCustom: false, generalDiscount: 0 };
        if (restored.draft.generalDiscount === undefined || restored.draft.generalDiscount === null) restored.draft.generalDiscount = 0;
        if (!restored.draft.customer) restored.draft.customer = { name: '', cpf: '', address: '', phone: '' };
        if (!Array.isArray(restored.draft.lines)) restored.draft.lines = [];
        restored.prices.forEach(function (item) { if (item.note === undefined) item.note = ''; if (!item.unit) item.unit = item.mode === 'meter' || item.mode === 'base' ? 'm' : item.mode === 'thousand' ? 'unidades' : 'un'; });
        if (!restored.schemaVersion || restored.schemaVersion < 3) {
          var migratedSeedDb = createSeedDb();
          migratedSeedDb.prices.forEach(function (seed) {
            var existing = restored.prices.find(function (item) { return item.id === seed.id; });
            if (!existing) restored.prices.push(seed);
          });
          var edits = {
            'p_gua_01': { name:'Linha Guajará — 1 m', category:'Madeira Guajará', mode:'meter', baseQty:1, unit:'m' },
            'p_gua_02': { name:'Caibro Guajará — 1 m', category:'Madeira Guajará', mode:'meter', baseQty:1, unit:'m' },
            'p_gua_03': { name:'Ripa Guajará — 1 m', category:'Madeira Guajará', mode:'meter', baseQty:1, unit:'m' },
            'p_mas_01': { name:'Linha Maçaranduba — 1 m', category:'Madeira Maçaranduba', mode:'meter', baseQty:1, unit:'m' },
            'p_mas_02': { name:'Caibro Maçaranduba — 1 m', category:'Madeira Maçaranduba', mode:'meter', baseQty:1, unit:'m' },
            'p_mas_03': { name:'Ripa Maçaranduba — 1 m', category:'Madeira Maçaranduba', mode:'meter', baseQty:1, unit:'m' },
            'p_mas_04': { name:'Forro Maçaranduba — 60/70/80 (registro anterior)', category:'Forro de madeira', mode:'unknown', unit:'?', note:'Registro anterior: R$ 160,00 para 60/70/80. Pode ser diferente do forro sem medida especificada anotado por R$ 180,00; confirmar.' },
            'p_mas_05': { name:'Alisado Guajará — 1 m', category:'Madeira Guajará', mode:'meter', baseQty:1, unit:'m', note:'O preço de R$ 8,00 foi associado a Guajará na tabela complementar.' },
            'p_mas_06': { name:'Muiracatiara — peça não identificada', category:'Muiracatiara', mode:'unknown', unit:'?', note:'A anotação informa R$ 15,00, mas não permite identificar a peça nem a unidade.' },
            'p_gua_04': { name:'Forro de Guajará (60/70/80; padrão 13?)', category:'Forro de madeira', mode:'unknown', unit:'?', note:'A anotação menciona 60, 70 e 80 e “padrão 13 (?)”. Unidade de cobrança não confirmada.' },
            'p_bar_01': { name:'Barrote de pinus 6 × 6 cm (3 m)', category:'Barrote de pinus', mode:'unit', unit:'un', note:'Dimensão e comprimento conforme a tabela complementar.' },
            'p_bar_02': { name:'Barrote de pinus 6 × 6 cm (3 m) plainado', category:'Barrote de pinus', mode:'unit', unit:'un', note:'Dimensão e comprimento conforme a tabela complementar.' },
            'p_mui_01': { name:'Tábua de Muiracatiara — registro anterior (1 m linear, 3,5)', category:'Tábuas especiais — registro anterior', mode:'unknown', unit:'?', note:'O registro anterior menciona “1 m linear, 3,5”, mas a tabela complementar informa m². Confirmar se é o mesmo produto antes de usar.' },
            'p_mui_02': { name:'TANI BUQUÊ (nome a confirmar)', category:'Preço antigo — identificar', mode:'unknown', unit:'?', note:'Registro antigo de nome incerto. Não confundir com a tábua para andaime sem confirmar.' },
            'p_mad_01': { name:'Madeirite preto — 10 mm', category:'Madeirite preto', mode:'unknown', unit:'?', note:'Espessura identificada; confirmar se o preço é por chapa ou outra unidade.' },
            'p_mad_02': { name:'Madeirite preto — 12 mm', category:'Madeirite preto', mode:'unknown', unit:'?', note:'Espessura identificada; confirmar se o preço é por chapa ou outra unidade.' }
          };
          Object.keys(edits).forEach(function (id) { var row = restored.prices.find(function (item) { return item.id === id; }); if (row) Object.keys(edits[id]).forEach(function (key) { row[key] = edits[id][key]; }); });
        }
        if (!restored.schemaVersion || restored.schemaVersion < 4) {
          var restoredMilheiro = {
            'p_mat_telha': 'Preço confirmado por milheiro (1.000 unidades). Informe a quantidade em unidades, inclusive quantidades menores como 800.',
            'p_mat_tijolo': 'Preço confirmado por milheiro (1.000 unidades). O tipo de tijolo ainda precisa ser identificado.'
          };
          ['p_mat_telha', 'p_mat_tijolo'].forEach(function (id) {
            var material = restored.prices.find(function (item) { return item.id === id; });
            if (material) {
              material.mode = 'thousand'; material.baseQty = 1000; material.unit = 'unidades'; material.note = restoredMilheiro[id];
            }
          });
        }
        restored.movements.forEach(function (movement) {
          if (!movement || typeof movement !== 'object') return;
          var linkedStock = restored.stocks.find(function (item) { return item.id === movement.stockItemId; });
          if (!movement.itemName && linkedStock) movement.itemName = linkedStock.name;
          if (!movement.unit && linkedStock) movement.unit = linkedStock.unit || 'un';
          if (movement.responsible === undefined || movement.responsible === null) movement.responsible = '';
          if (movement.note === undefined || movement.note === null) movement.note = '';
          var dateOnly = movementDateValue(movement.date);
          if (dateOnly) movement.date = dateOnly;
        });
        if (typeof restored.draft.showCustomerDetails !== 'boolean') restored.draft.showCustomerDetails = false;
        if (!restored.draft.billingMode) {
          var draftProduct = restored.prices.find(function (item) { return item.id === restored.draft.selectedPriceId; });
          restored.draft.billingMode = !draftProduct ? 'unit' : draftProduct.mode === 'thousand' ? 'thousand' : draftProduct.mode === 'area' ? 'area' : (draftProduct.mode === 'unit' || draftProduct.mode === 'unknown') ? 'unit' : 'length';
        }
        restored.schemaVersion = 6;
        db = restored; persist(); navigate('inicio'); showToast('Cópia restaurada com sucesso.');
      } catch (error) { showToast('Esse arquivo não parece ser uma cópia válida do Assistente da Serraria.'); }
    };
    reader.readAsText(file);
  }

  function colLetter(number) {
    var result = '';
    while (number > 0) { var remainder = (number - 1) % 26; result = String.fromCharCode(65 + remainder) + result; number = Math.floor((number - 1) / 26); }
    return result;
  }
  function xmlEscape(text) { return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;'); }
  function sheetXml(sheet) {
    var rows = sheet.rows || [];
    var maxCols = rows.reduce(function (max, row) { return Math.max(max, row.length); }, 1);
    var widths = [];
    for (var col = 0; col < maxCols; col++) {
      var width = 12;
      rows.slice(0, 100).forEach(function (row) { var v = row[col]; if (v !== null && v !== undefined) width = Math.max(width, Math.min(38, String(v).length + 2)); });
      widths.push(Math.min(38, width));
    }
    var colXml = '<cols>' + widths.map(function (width, index) { return '<col min="' + (index+1) + '" max="' + (index+1) + '" width="' + width + '" customWidth="1"/>'; }).join('') + '</cols>';
    var rowXml = rows.map(function (row, rowIndex) {
      var rowNumber = rowIndex + 1;
      var cells = row.map(function (value, colIndex) {
        if (value === null || value === undefined || value === '') return '';
        var reference = colLetter(colIndex + 1) + rowNumber;
        var style = rowIndex === 0 ? 1 : (sheet.currencyCols && sheet.currencyCols.indexOf(colIndex) !== -1 ? 2 : (typeof value === 'number' ? 3 : 4));
        if (typeof value === 'number' && isFinite(value)) return '<c r="' + reference + '" s="' + style + '"><v>' + value + '</v></c>';
        return '<c r="' + reference + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + xmlEscape(value) + '</t></is></c>';
      }).join('');
      return '<row r="' + rowNumber + '"' + (rowIndex === 0 ? ' ht="30" customHeight="1"' : '') + '>' + cells + '</row>';
    }).join('');
    var lastCell = colLetter(maxCols) + Math.max(rows.length,1);
    var filter = rows.length > 1 ? '<autoFilter ref="A1:' + lastCell + '"/>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="21"/>' + colXml + '<sheetData>' + rowXml + '</sheetData>' + filter + '</worksheet>';
  }
  function makeCrcTable() {
    var table = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  }
  var crcTable = makeCrcTable();
  function crc32(bytes) {
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
    return (crc ^ (-1)) >>> 0;
  }
  function u16(view, offset, value) { view.setUint16(offset, value, true); }
  function u32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  function zipFiles(files) {
    var encoder = new TextEncoder();
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var now = new Date();
    var dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
    var dosDate = (((now.getFullYear() - 1980) & 127) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
    files.forEach(function (file) {
      var nameBytes = encoder.encode(file.name);
      var dataBytes = encoder.encode(file.content);
      var crc = crc32(dataBytes);
      var localBuffer = new ArrayBuffer(30);
      var localView = new DataView(localBuffer);
      u32(localView,0,0x04034b50); u16(localView,4,20); u16(localView,6,0x0800); u16(localView,8,0); u16(localView,10,dosTime); u16(localView,12,dosDate); u32(localView,14,crc); u32(localView,18,dataBytes.length); u32(localView,22,dataBytes.length); u16(localView,26,nameBytes.length); u16(localView,28,0);
      localParts.push(new Uint8Array(localBuffer), nameBytes, dataBytes);
      var centralBuffer = new ArrayBuffer(46);
      var centralView = new DataView(centralBuffer);
      u32(centralView,0,0x02014b50); u16(centralView,4,20); u16(centralView,6,20); u16(centralView,8,0x0800); u16(centralView,10,0); u16(centralView,12,dosTime); u16(centralView,14,dosDate); u32(centralView,16,crc); u32(centralView,20,dataBytes.length); u32(centralView,24,dataBytes.length); u16(centralView,28,nameBytes.length); u16(centralView,30,0); u16(centralView,32,0); u16(centralView,34,0); u16(centralView,36,0); u32(centralView,38,0); u32(centralView,42,offset);
      centralParts.push(new Uint8Array(centralBuffer), nameBytes);
      offset += 30 + nameBytes.length + dataBytes.length;
    });
    var centralSize = centralParts.reduce(function (sum, part) { return sum + part.length; }, 0);
    var eocdBuffer = new ArrayBuffer(22);
    var eocdView = new DataView(eocdBuffer);
    u32(eocdView,0,0x06054b50); u16(eocdView,4,0); u16(eocdView,6,0); u16(eocdView,8,files.length); u16(eocdView,10,files.length); u32(eocdView,12,centralSize); u32(eocdView,16,offset); u16(eocdView,20,0);
    return new Blob(localParts.concat(centralParts, [new Uint8Array(eocdBuffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function workbookBlob() {
    var stockRows = [['Categoria','Item','Unidade','Estoque atual','Estoque inicial anotado','Saídas antigas anotadas na planilha','Última atualização']];
    db.stocks.forEach(function (item) { stockRows.push([item.category, item.name, item.unit || 'un', item.currentQty === undefined ? null : item.currentQty, item.initialQty === undefined ? null : item.initialQty, item.removedLegacy === undefined ? null : item.removedLegacy, item.updatedAt ? dateText(item.updatedAt, true) : '']); });
    var priceRows = [['Categoria','Item','Preço (R$)','Forma de cobrança','Base de quantidade','Unidade da quantidade','Dimensões / especificações e observações','Última atualização']];
    db.prices.forEach(function (item) { priceRows.push([item.category, item.name, Number(item.price) || 0, item.mode === 'unknown' ? 'Unidade a confirmar' : item.mode === 'thousand' ? 'Por milheiro (1.000 unidades)' : item.mode === 'area' ? 'Metro quadrado' : item.mode === 'meter' ? 'Metro linear' : item.mode === 'base' ? 'Preço por base de metros' : 'Por unidade (' + (item.unit || 'un') + ')', Number(item.baseQty) || 1, item.unit || 'un', item.note || '', item.updatedAt ? dateText(item.updatedAt, true) : '']); });
    var movementRows = [['Data da movimentação','Tipo','ID do material','Item (nome registrado na movimentação)','Quantidade movimentada','Unidade','Pessoa responsável pela retirada','Saldo antes','Saldo depois','Observações']];
    db.movements.slice().sort(function (a,b) { return movementDateValue(b.date).localeCompare(movementDateValue(a.date)); }).forEach(function (item) { movementRows.push([movementDateText(item.date), item.type, item.stockItemId || '', item.itemName || '', item.quantity === undefined ? null : item.quantity, item.unit || '', item.responsible || '', item.before === undefined ? null : item.before, item.after === undefined ? null : item.after, item.note || '']); });
    var receiptRows = [['Número','Data e hora','Cliente','CPF','Endereço','Telefone','Quantidade de linhas','Total final (R$)','Subtotal após descontos por produto (R$)','Desconto geral (R$)','Subtotal original dos itens (R$)','Descontos por produto (R$)']];
    var lineRows = [['Nota','Data e hora','Cliente','Item','Categoria','Quantidade de peças/unidades','Unidade','Comprimento por peça (m)','Largura por peça (m)','Comprimento total (m)','Área total (m²)','Cobrança aplicada','Preço cadastrado/original (R$)','Modo/base do preço','Base de metros','Desconto por unidade comercial (R$)','Preço final por unidade comercial (R$)','Subtotal original do item (R$)','Desconto total do item (R$)','Total final do item (R$)']];
    db.receipts.slice().sort(function (a,b) { return new Date(a.date)-new Date(b.date); }).forEach(function (receipt) {
      var c = receipt.customer || {};
      var lineSumOriginal = receipt.lines.reduce(function (sum, line) { return sum + getLineSubtotal(line); }, 0);
      var lineDiscountSum = receipt.lines.reduce(function (sum, line) { return sum + getLineDiscount(line); }, 0);
      var receiptSubtotal = receipt.subtotal === undefined ? receipt.lines.reduce(function (sum, line) { return sum + (Number(line.total) || 0); }, 0) : Number(receipt.subtotal) || 0;
      receiptRows.push([receipt.number, dateText(receipt.date, true), c.name || '', c.cpf || '', c.address || '', c.phone || '', receipt.lines.length, Number(receipt.total) || 0, receiptSubtotal, Number(receipt.generalDiscount) || 0, receipt.originalSubtotal === undefined ? roundMoney(lineSumOriginal) : receipt.originalSubtotal, receipt.itemDiscountTotal === undefined ? roundMoney(lineDiscountSum) : receipt.itemDiscountTotal]);
      receipt.lines.forEach(function (line) {
        var rate = linePricePerMeasureUnit(line);
        lineRows.push([receipt.number, dateText(receipt.date, true), c.name || '', line.name, line.category || '', Number(line.quantity) || 0, line.unit || 'un', line.lengthPerPiece == null ? null : Number(line.lengthPerPiece), line.widthPerPiece == null ? null : Number(line.widthPerPiece), line.totalLength == null ? null : Number(line.totalLength), line.totalArea == null ? null : Number(line.totalArea), line.billingMode === 'thousand' ? 'Por milheiro (1.000 unidades)' : line.billingMode === 'area' ? 'Por área (m²)' : line.billingMode === 'length' ? 'Por comprimento' : 'Por peça/unidade', Number(line.price) || 0, line.mode === 'thousand' ? 'Preço por milheiro' : line.mode === 'area' ? 'Preço por m²' : line.mode === 'meter' ? 'Preço por metro' : line.mode === 'base' ? 'Preço por base' : 'Preço por unidade', Number(line.baseQty) || 1, Number(line.discountPerUnit) || 0, lineFinalCommercialPrice(line), getLineSubtotal(line), getLineDiscount(line), Number(line.total) || 0]);
      });
    });
    var sheets = [
      { name: 'Estoque', rows: stockRows },
      { name: 'Preços', rows: priceRows, currencyCols: [2] },
      { name: 'Movimentações', rows: movementRows },
      { name: 'Notas', rows: receiptRows, currencyCols: [7,8,9,10,11] },
      { name: 'Itens das notas', rows: lineRows, currencyCols: [12,15,16,17,18,19] }
    ];
    var files = [];
    files.push({ name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + sheets.map(function (s,i) { return '<Override PartName="/xl/worksheets/sheet' + (i+1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' });
    files.push({ name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' });
    files.push({ name: 'xl/workbook.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' + sheets.map(function (s,i) { return '<sheet name="' + xmlEscape(s.name) + '" sheetId="' + (i+1) + '" r:id="rId' + (i+1) + '"/>'; }).join('') + '</sheets></workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function (s,i) { return '<Relationship Id="rId' + (i+1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i+1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length+1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
    files.push({ name: 'xl/styles.xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="#,##0.###"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1D5B4D"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE2E8E0"/></left><right style="thin"><color rgb="FFE2E8E0"/></right><top style="thin"><color rgb="FFE2E8E0"/></top><bottom style="thin"><color rgb="FFE2E8E0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" horizontal="center" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>' });
    sheets.forEach(function (sheet,i) { files.push({ name: 'xl/worksheets/sheet' + (i+1) + '.xml', content: sheetXml(sheet) }); });
    return zipFiles(files);
  }
  function generateExcel(share) {
    var blob;
    try { blob = workbookBlob(); }
    catch (error) { showToast('Não consegui montar o Excel. Faça uma cópia JSON e tente novamente.'); return; }
    var filename = 'serraria-sao-francisco-' + new Date().toISOString().slice(0,10) + '.xlsx';
    if (share && navigator.share && typeof File !== 'undefined') {
      var file = new File([blob], filename, { type: blob.type });
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: 'Planilha atualizada da serraria', text: 'Estoque, preços, movimentações e notas.' }).then(function () { showToast('Planilha preparada para compartilhar.'); }).catch(function (error) { if (error && error.name !== 'AbortError') { downloadBlob(blob, filename); showToast('O Excel foi baixado para o aparelho.'); } });
        return;
      }
    }
    downloadBlob(blob, filename);
    showToast('Excel gerado. Procure o arquivo na pasta Downloads para enviar.');
  }

  document.addEventListener('click', function (event) {
    var nav = event.target.closest('[data-page]');
    if (nav) { event.preventDefault(); navigate(nav.getAttribute('data-page')); return; }
    var button = event.target.closest('[data-action]');
    if (!button) return;
    var action = button.getAttribute('data-action');
    var id = button.getAttribute('data-id');
    if (action === 'go-sale') navigate('venda');
    else if (action === 'show-all-sale-products') { saleShowAll = !saleShowAll; updateSaleProductResults(); }
    else if (action === 'change-sale-product') { db.draft.selectedPriceId = ''; saleSearch = ''; saleShowAll = false; persist(true); renderPage(); var saleSearchInput = document.getElementById('sale-search'); if (saleSearchInput) saleSearchInput.focus(); }
    else if (action === 'add-line') addPricedLine();
    else if (action === 'toggle-custom') { captureCustomerFields(); db.draft.showCustom = !db.draft.showCustom; persist(); renderPage(); }
    else if (action === 'remove-line') { var removeIndex = Number(button.getAttribute('data-index')); var lineToRemove = db.draft.lines[removeIndex]; if (lineToRemove && window.confirm('Remover “' + lineToRemove.name + '” desta nota? Essa ação não pode ser desfeita.')) { captureCustomerFields(); db.draft.lines.splice(removeIndex,1); if (db.draft.generalDiscount > draftSubtotal()) db.draft.generalDiscount = draftSubtotal(); persist(); renderPage(); showToast('Item removido da nota.'); } }
    else if (action === 'edit-line') editLineForm(button.getAttribute('data-index'));
    else if (action === 'complete-note') completeNote();
    else if (action === 'close-receipt-preview') { closeModal(); page = 'venda'; pageHeading(); renderPage(); window.scrollTo(0, 0); showToast('A nota continua salva na seção “Notas”.'); }
    else if (action === 'confirm-print-operation') finishPrintOperation(true);
    else if (action === 'cancel-print-operation') finishPrintOperation(false);
    else if (action === 'undo-print-confirmation') undoPrintConfirmation(id);
    else if (action === 'close-modal' && pendingPrintOperation && pendingPrintOperation.promptShown) finishPrintOperation(false);
    else if (action === 'close-modal') closeModal();
    else if (action === 'backdrop-close' && event.target === button && pendingPrintOperation && pendingPrintOperation.promptShown) finishPrintOperation(false);
    else if (action === 'backdrop-close' && event.target === button) closeModal();
    else if (action === 'stock-add') stockForm(null);
    else if (action === 'stock-edit') { var stock = db.stocks.find(function (row) { return row.id === id; }); if (stock) stockForm(stock); }
    else if (action === 'stock-adjust') { var stockItem = db.stocks.find(function (row) { return row.id === id; }); if (stockItem) stockAdjustForm(stockItem); }
    else if (action === 'clear-history-filters') { historyMaterialSearch = ''; historyPersonSearch = ''; historyStartDate = ''; historyEndDate = ''; historyTypeFilter = 'Todos'; renderPage(); }
    else if (action === 'price-add') priceForm(null);
    else if (action === 'price-edit') { var price = db.prices.find(function (row) { return row.id === id; }); if (price) priceForm(price); }
    else if (action === 'price-delete') { var deletePrice = db.prices.find(function (row) { return row.id === id; }); if (deletePrice && window.confirm('Excluir o preço de “' + deletePrice.name + '”? As notas antigas continuarão salvas.')) { db.prices = db.prices.filter(function (row) { return row.id !== id; }); persist(); closeModal(); navigate('precos'); showToast('Preço excluído.'); } }
    else if (action === 'print-note') printReceipt(id);
    else if (action === 'print-selected-notes') printSelectedReceipts();
    else if (action === 'share-xlsx') generateExcel(true);
    else if (action === 'export-xlsx') generateExcel(false);
    else if (action === 'backup-json') backupJson();
    else if (action === 'restore-json') { var restore = document.getElementById('restore-input'); if (restore) { restore.value = ''; restore.click(); } }
    else if (action === 'price-delete') return;
    else if (action === 'clear-draft') { if (window.confirm('Apagar os itens e os descontos desta nota em andamento?')) { db.draft.lines = []; db.draft.generalDiscount = 0; persist(); renderPage(); } }
  });

  document.addEventListener('submit', function (event) {
    var form = event.target;
    var type = form.getAttribute('data-form');
    if (!type) return;
    event.preventDefault();
    if (type === 'stock') saveStockForm(form);
    else if (type === 'stock-adjust') saveStockAdjust(form);
    else if (type === 'price') savePriceForm(form);
    else if (type === 'draft-line') saveDraftLineForm(form);
    else if (type === 'custom-line') addCustomLine(form);
    else if (type === 'business') {
      var data = new FormData(form);
      db.business.name = String(data.get('name') || '').trim() || 'Serraria São Francisco';
      db.business.address = String(data.get('address') || '').trim();
      db.business.phone = String(data.get('phone') || '').trim();
      persist(); renderPage(); showToast('Identificação da loja atualizada.');
    }
  });

  document.addEventListener('input', function (event) {
    var target = event.target;
    if (target.hasAttribute('data-customer')) {
      db.draft.customer[target.getAttribute('data-customer')] = target.value;
      persist(true);
    }
    if (target.id === 'sale-search') {
      saleSearch = target.value;
      saleShowAll = false;
      updateSaleProductResults();
    }
    if (target.id === 'stock-search') {
      stockSearch = target.value;
      var list = document.getElementById('stock-list');
      if (list) { var items = filteredStock(); list.innerHTML = items.length ? items.map(stockItemCard).join('') : '<div class="empty"><strong>Nenhum item encontrado.</strong>Tente mudar a busca ou o filtro.</div>'; }
    }
    if (target.id === 'price-search') {
      priceSearch = target.value;
      var priceList = document.getElementById('price-list');
      if (priceList) { var itemsPrice = filteredPrices(); priceList.innerHTML = itemsPrice.length ? itemsPrice.map(priceItemCard).join('') : '<div class="empty"><strong>Nenhum produto encontrado.</strong>Tente mudar a busca ou cadastre um produto.</div>'; }
    }
    if (target.id === 'history-material-search' || target.id === 'history-person-search' || target.id === 'history-start-date' || target.id === 'history-end-date') {
      if (target.id === 'history-material-search') historyMaterialSearch = target.value;
      if (target.id === 'history-person-search') historyPersonSearch = target.value;
      if (target.id === 'history-start-date') historyStartDate = target.value;
      if (target.id === 'history-end-date') historyEndDate = target.value;
      updateStockHistoryList();
    }
    if (target.id === 'general-discount') {
      db.draft.generalDiscount = Math.max(0, asNum(target.value));
      updateDraftTotals();
      persist(true);
    }
    if (target.id === 'sale-quantity' || target.id === 'sale-length' || target.id === 'sale-width' || target.id === 'sale-billing' || target.id === 'sale-discount-unit') updateSalePreview();
  });
  document.addEventListener('change', function (event) {
    var target = event.target;
    if (target.matches('[data-receipt-select]')) {
      var receiptId = target.getAttribute('data-id');
      if (target.checked) {
        if (selectedReceiptIds.indexOf(receiptId) === -1) selectedReceiptIds.push(receiptId);
      } else {
        selectedReceiptIds = selectedReceiptIds.filter(function (selectedId) { return selectedId !== receiptId; });
      }
      updateReceiptSelectionControls();
    }
    if (target.matches('[data-select-all-receipts]')) {
      var sortedReceiptsForSelection = db.receipts.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
      selectedReceiptIds = target.checked ? sortedReceiptsForSelection.map(function (receipt) { return receipt.id; }) : [];
      document.querySelectorAll('[data-receipt-select]').forEach(function (checkbox) { checkbox.checked = target.checked; });
      updateReceiptSelectionControls();
    }
    if (target.id === 'sale-quantity' || target.id === 'sale-length' || target.id === 'sale-width' || target.id === 'sale-billing' || target.id === 'sale-discount-unit') updateSalePreview();
    if (target.id === 'history-type-filter') { historyTypeFilter = target.value; updateStockHistoryList(); }
    if (target.id === 'adjust-operation') { var responsibleWrap = document.getElementById('adjust-responsible-wrap'); var responsibleInput = document.getElementById('adjust-responsible'); var showResponsible = target.value === 'out'; if (responsibleWrap) responsibleWrap.style.display = showResponsible ? 'grid' : 'none'; if (responsibleInput) { responsibleInput.required = showResponsible; if (!showResponsible) responsibleInput.value = ''; } }
    if (target.id === 'price-mode') updatePriceBaseField();
    if (target.id === 'custom-unit') updateCustomDiscountLabel();
    if (target.id === 'custom-mode') {
      var base = document.getElementById('custom-base-wrap');
      var length = document.getElementById('custom-length-wrap');
      if (base) base.style.display = target.value === 'base' ? 'grid' : 'none';
      if (length) length.style.display = target.value === 'unit' ? 'none' : 'grid';
      var width = document.getElementById('custom-width-wrap');
      if (width) width.style.display = target.value === 'area' ? 'grid' : 'none';
      updateCustomDiscountLabel();
    }
    if (target.id === 'restore-input' && target.files && target.files[0]) restoreJsonFile(target.files[0]);
  });
  document.addEventListener('toggle', function (event) {
    if (event.target && event.target.id === 'customer-details') {
      db.draft.showCustomerDetails = event.target.open;
      persist(true);
    }
  }, true);

  function updateStockHistoryList() {
    var list = document.getElementById('stock-history-list');
    var count = document.getElementById('stock-history-count');
    if (!list) return;
    var items = filteredStockMovements();
    if (count) count.textContent = items.length + (items.length === 1 ? ' movimentação encontrada' : ' movimentações encontradas');
    list.innerHTML = items.length ? items.map(stockMovementCard).join('') : '<div class="empty"><strong>Nenhuma movimentação encontrada.</strong>Altere os filtros para consultar outros registros.</div>';
  }
  function updateSaleProductResults() {
    var results = document.getElementById('sale-product-results');
    var showResults = saleShowAll || !!normalizeSearch(saleSearch);
    if (results) {
      results.innerHTML = showResults ? saleProductResultsHtml() : '';
      results.hidden = !showResults;
    }
    var toggle = document.querySelector('[data-action="show-all-sale-products"]');
    if (toggle) toggle.textContent = saleShowAll ? 'Mostrar menos produtos' : 'Ver lista completa de produtos';
  }
  function updateDraftTotals() {
    var subtotal = document.getElementById('draft-subtotal');
    var total = document.getElementById('draft-total');
    var help = document.getElementById('general-discount-help');
    var input = document.getElementById('general-discount');
    var generalDiscountSummary = document.getElementById('draft-general-discount-summary');
    var max = draftSubtotal();
    var discount = Number(db.draft.generalDiscount) || 0;
    if (subtotal) subtotal.textContent = money(max);
    if (generalDiscountSummary) generalDiscountSummary.textContent = '− ' + money(discount);
    if (total) total.textContent = money(Math.max(0, max - discount));
    if (input) input.max = moneyInput(max);
    if (help) {
      if (discount > max + 0.000001) { help.textContent = 'O desconto informado supera o subtotal. Reduza o desconto antes de salvar a nota.'; help.classList.add('field-error'); }
      else { help.textContent = 'Desconto aplicado uma única vez sobre o subtotal já reduzido pelos descontos de produto.'; help.classList.remove('field-error'); }
    }
  }
  function updateSalePreview() {
    var quantityInput = document.getElementById('sale-quantity');
    var lengthInput = document.getElementById('sale-length');
    var widthInput = document.getElementById('sale-width');
    var billingInput = document.getElementById('sale-billing');
    var discountInput = document.getElementById('sale-discount-unit');
    var preview = document.getElementById('sale-preview');
    var help = document.getElementById('sale-product-help');
    var lengthWrap = document.getElementById('sale-length-wrap');
    var widthWrap = document.getElementById('sale-width-wrap');
    var mathDetail = document.getElementById('sale-math-detail');
    var discountHelp = document.getElementById('sale-discount-help');
    if (!quantityInput || !preview) return;
    var item = db.prices.find(function (row) { return row.id === db.draft.selectedPriceId; });
    if (!item || item.mode === 'unknown') return;
    var billingMode = item.mode === 'thousand' ? 'thousand' : item.mode === 'area' ? 'area' : item.mode === 'unknown' ? 'unit' : item.mode !== 'unit' ? 'length' : (billingInput ? billingInput.value : (db.draft.billingMode || 'unit'));
    var quantity = asNum(quantityInput.value);
    var length = lengthInput ? asNum(lengthInput.value) : 1;
    var width = widthInput ? asNum(widthInput.value) : 1;
    var discount = discountInput ? asNum(discountInput.value) : 0;
    if (lengthWrap) lengthWrap.style.display = billingMode === 'length' || billingMode === 'area' ? 'grid' : 'none';
    if (widthWrap) widthWrap.style.display = billingMode === 'area' ? 'grid' : 'none';
    var tempLine = { quantity: quantity, price: Number(item.price), mode: item.mode, baseQty: Number(item.baseQty) || 1, billingMode: billingMode, lengthPerPiece: length, widthPerPiece: width, unit: billingMode === 'length' || billingMode === 'area' ? 'peças' : (item.unit || 'un') };
    var rate = linePricePerMeasureUnit(tempLine);
    var commercialRate = lineOriginalCommercialPrice(tempLine);
    var measured = lineMeasureQuantity(tempLine);
    var discountMeasure = lineDiscountMeasureQuantity(tempLine);
    var subtotal = roundMoney(measured * rate);
    var validDiscount = discount >= 0 && discount <= commercialRate + 0.000001;
    var discountTotal = roundMoney(discountMeasure * discount);
    var finalRate = Math.max(0, commercialRate - discount);
    var total = roundMoney(Math.max(0, subtotal - discountTotal));
    var unitLabel = lineDiscountUnitLabel(tempLine);
    var discountLabel = document.getElementById('sale-discount-unit-label');
    if (discountLabel) discountLabel.textContent = 'Desconto neste produto (R$ por ' + unitLabel + ')';
    preview.textContent = money(total);
    if (discountHelp) {
      discountHelp.textContent = 'Preço original: ' + money(commercialRate) + '/' + unitLabel + '. Preço com desconto: ' + money(finalRate) + '/' + unitLabel + '. O cadastro não será alterado.';
      discountHelp.classList.toggle('field-error', !validDiscount);
      if (!validDiscount) discountHelp.textContent += ' O desconto não pode superar o preço original.';
    }
    if (billingMode === 'thousand') {
      if (mathDetail) mathDetail.textContent = qtyText(quantity) + ' unidades (' + qtyText(quantity / 1000) + ' milheiro) × ' + money(commercialRate) + '/milheiro − desconto de ' + money(discount) + '/milheiro = ' + money(total) + (validDiscount ? '.' : ' · desconto inválido.');
      if (help) help.textContent = 'O preço e o desconto são por milheiro (1.000 unidades); informe a quantidade física em unidades.';
    } else if (billingMode === 'area') {
      if (mathDetail) mathDetail.textContent = qtyText(quantity) + ' peça(s) × ' + qtyText(length) + ' m × ' + qtyText(width) + ' m = ' + qtyText(measured) + ' m² · preço original ' + money(commercialRate) + '/m² · desconto ' + money(discount) + '/m² · total ' + money(total) + (validDiscount ? '.' : ' · desconto inválido.');
      if (help) help.textContent = 'O cálculo usa área total × preço por m² após desconto.';
    } else if (billingMode === 'length') {
      if (mathDetail) mathDetail.textContent = qtyText(quantity) + ' peça(s) × ' + qtyText(length) + ' m = ' + qtyText(measured) + ' m · preço original ' + money(commercialRate) + '/m · desconto ' + money(discount) + '/m · total ' + money(total) + (validDiscount ? '.' : ' · desconto inválido.');
      if (help && item.mode === 'unit') help.textContent = 'Ao escolher comprimento, o preço é interpretado como preço por 1 metro. Essa escolha vale somente para esta nota.';
      else if (help) help.textContent = priceDescription(item) + '. O desconto vale para cada metro medido.';
    } else {
      if (mathDetail) mathDetail.textContent = qtyText(quantity) + ' × ' + money(commercialRate) + '/' + unitLabel + ' − desconto de ' + money(discount) + '/' + unitLabel + ' = ' + money(total) + (validDiscount ? '.' : ' · desconto inválido.');
      if (help) help.textContent = priceDescription(item) + '. O desconto será aplicado por unidade comercial.';
    }
  }
  document.addEventListener('click', function (event) {
    var picked = event.target.closest('[data-price-pick]');
    if (picked) {
      var product = db.prices.find(function (item) { return item.id === picked.getAttribute('data-price-pick'); });
      if (!product) return;
      db.draft.selectedPriceId = product.id;
      db.draft.billingMode = product.mode === 'thousand' ? 'thousand' : product.mode === 'area' ? 'area' : (product.mode === 'unit' || product.mode === 'unknown') ? 'unit' : 'length';
      saleSearch = '';
      saleShowAll = false;
      persist(true);
      renderPage();
      var quantityInput = document.getElementById('sale-quantity');
      if (quantityInput) quantityInput.focus();
      return;
    }
    var stockChip = event.target.closest('[data-stock-filter]');
    if (stockChip) { stockFilter = stockChip.getAttribute('data-stock-filter'); renderPage(); return; }
    var priceChip = event.target.closest('[data-price-filter]');
    if (priceChip) { priceFilter = priceChip.getAttribute('data-price-filter'); renderPage(); return; }
  });

  // O retorno da tela de impressão apenas solicita uma confirmação manual; nunca confirma sozinho.
  window.addEventListener('message', function (event) {
    var data = event && event.data;
    if (!pendingPrintOperation || !data || data.type !== 'serraria-print-afterprint') return;
    if (event.source !== pendingPrintOperation.printWindow || data.token !== pendingPrintOperation.token) return;
    showPrintConfirmation();
  });
  window.addEventListener('blur', function () {
    if (pendingPrintOperation) pendingPrintOperation.sawBlur = true;
  });
  window.addEventListener('focus', function () {
    if (!pendingPrintOperation || !pendingPrintOperation.sawBlur || pendingPrintOperation.promptShown) return;
    setTimeout(function () {
      if (!pendingPrintOperation || pendingPrintOperation.promptShown || !pendingPrintOperation.sawBlur) return;
      // Evento de fallback: o retorno ao app não comprova impressão; apenas abre a pergunta.
      showPrintConfirmation();
    }, 700);
  });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && pendingPrintOperation && pendingPrintOperation.sawBlur && !pendingPrintOperation.promptShown) {
      setTimeout(function () { showPrintConfirmation(); }, 500);
    }
  });

  // Registra o app para instalação e funcionamento offline depois da primeira visita.
  if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('./sw.js').catch(function () {}); });
  }
  pageHeading();
  renderPage();
})();
