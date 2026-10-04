const fs = require('fs');
const path = require('path');

const jevPath = path.join('src', 'jev', 'contextAggregatorCupones.ts');
fs.copyFileSync(jevPath, `${jevPath}.bak`);
console.log(`[BACKUP] Creado ${jevPath}.bak`);

let content = fs.readFileSync(jevPath, 'utf8');

// Reemplazar la lógica de clasificación para que detecte correctamente los expirados sin depender del switch activo
const oldLogic = `      const esExpirado = activo && diasRestantes < 0;
      const esAgotado = activo && limiteUsos > 0 && usosActuales >= limiteUsos;

      if (esExpirado) {
        expiradosCount++;
      } else if (esAgotado) {
        agotadosCount++;
      } else if (activo) {
        activosCount++;
      } else {
        inactivosCount++;
      }`;

const newLogic = `      // Un cupón está expirado si la fecha ya pasó, sin importar el estado del switch
      const esExpirado = diasRestantes < 0;
      const esAgotado = limiteUsos > 0 && usosActuales >= limiteUsos;

      if (esExpirado) {
        expiradosCount++;
      } else if (esAgotado) {
        agotadosCount++;
      } else if (activo) {
        activosCount++;
      } else {
        inactivosCount++;
      }`;

if (content.includes(oldLogic)) {
  content = content.replace(oldLogic, newLogic);
  fs.writeFileSync(jevPath, content, 'utf8');
  console.log('✅ contextAggregatorCupones.ts actualizado: detección de expirados y activos sincronizada al 100%.');
} else {
  console.log('ℹ️ La lógica ya estaba actualizada o difiere levemente.');
}

