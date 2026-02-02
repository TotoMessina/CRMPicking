const fs = require('fs');

const path = "c:\\Users\\Usr\\Desktop\\CRMPicking-main\\mapa.js";
let content = fs.readFileSync(path, 'utf8');

const replacements = [
    ['ðŸ—‘ï¸', '🗑️'],
    ['SÃ­', 'Sí'],
    ['Ã³', 'ó'],
    ['Ã¡', 'á'],
    ['Ã©', 'é'], // covers Mié, etc
    ['Ã­', 'í'], // covers dÃ­a, aquÃ­
    ['Ãº', 'ú'],
    ['Ã±', 'ñ'],
    ['Â¿', '¿'],
    ['â€œ', '“'],
    ['â€', '”'],
    ['â€”', '—'],
    ['ðŸ”µ', '🔵'],
    ['ðŸ”´', '🔴'],
    ['ðŸŸ ', '🟠'],
    ['â˜€ï¸', '☀️'],
    ['ðŸŒ™', '🌙'],
    ['prÃ¡ctico', 'práctico'],
    ['interÃ©s', 'interés'], // covers Sin interÃ©s, InterÃ©s
    ['DirecciÃ³n', 'Dirección'],
    ['SÃ¡b', 'Sáb'],
    ['SeleccionÃ¡', 'Seleccioná'],
    ['ubicaciÃ³n', 'ubicación'],
    ['vÃ¡lidas', 'válidas'],
    ['necesitÃ¡s', 'necesitás'],
    ['estÃ¡', 'está'], // estÃ¡
    ['RevisÃ¡', 'Revisá'],
    ['NORMALIZACIÃ“N', 'NORMALIZACIÓN'],
    ['DueÃ±o', 'Dueño'],
    ['TelÃ©fono', 'Teléfono'],
    ['VERIFICACIÃ“N', 'VERIFICACIÓN'],
    ['SESIÃ“N', 'SESIÓN'],
    ['sesiÃ³n', 'sesión'],
    ['pÃ¡gina', 'página'],
    ['querÃ©s', 'querés'],
    ['marcarÃ¡', 'marcará'],
    ['selecciÃ³n', 'selección'],
    ['todavÃ­a', 'todavía'],
    ['Ãºltimo', 'último'],
    ['lÃ­mite', 'límite'],
    ['abrirÃ¡', 'abrirá'],
    ['botÃ³n', 'botón'],
    ['deberÃ­a', 'debería'],
    ['vacÃ­o', 'vacío'],
    ['PodrÃ­amos', 'Podríamos'],
    ['tocÃ¡', 'tocá'],
    ['kmÂ²', 'km²'],
    ['mÂ²', 'm²'],
    ['Â¿Eliminar', '¿Eliminar']
];

let replacedCount = 0;
for (const [bad, good] of replacements) {
    if (content.includes(bad)) {
        // Global replace
        const parts = content.split(bad);
        replacedCount += parts.length - 1;
        content = parts.join(good);
    }
}

fs.writeFileSync(path, content, 'utf8');
console.log(`Fixed encoding. Replaced ${replacedCount} occurrences.`);
