/**
 * Constantes oficiales para el módulo Tarjetas de Seguimiento
 */
export const SHARE_CARDS_MODULE = {
  KEY: "share-cards",
  NAME: "Tarjetas de seguimiento",
  DESCRIPTION: "Permite crear tarjetas de seguimiento personalizadas y medir cada canal.",
  DEFAULT_LIMIT: 15,
  CANAL_DIRECTORIO: "directorio",
  TEXTS: {
    ADD_BUTTON: "+ Agregar tarjeta",
    DIRECTORY_CARD_TITLE: "Directorio de Markix",
    MODAL_TITLE: "Nueva Tarjeta de Seguimiento",
    ARCHIVE_CONFIRMATION: "Si ya imprimiste o publicaste este enlace, seguirá funcionando y contando visitas. Solo dejará de mostrarse aquí.",
    RESERVED_REF_ERROR: "El identificador no puede coincidir con canales del sistema ni con directorio.",
    LIMIT_REACHED_ERROR: "Has alcanzado el límite de tarjetas de seguimiento permitidas para tu negocio.",
    SUCCESS_SAVE: "Tarjeta de seguimiento guardada exitosamente.",
    SUCCESS_ARCHIVE: "Tarjeta archivada exitosamente."
  }
} as const;
