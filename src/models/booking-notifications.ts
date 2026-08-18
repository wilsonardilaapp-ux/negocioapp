/**
 * @fileOverview Definición del modelo de configuración de notificaciones de reservas.
 */

export interface BookingNotificationTemplate {
  enabled: boolean;
  message: string;
}

export interface BookingNotificationSettings {
  onCreate: BookingNotificationTemplate;
  onConfirm: BookingNotificationTemplate;
  onReschedule: BookingNotificationTemplate;
  onCancel: BookingNotificationTemplate;
  onReminder: BookingNotificationTemplate;
}

export const DEFAULT_BOOKING_NOTIFICATION_SETTINGS: BookingNotificationSettings = {
  onCreate: {
    enabled: true,
    message: "¡Hola {cliente}! 👋 Hemos recibido tu solicitud de reserva en {negocio} para el {fecha} a las {hora}. Estado: Pendiente."
  },
  onConfirm: {
    enabled: true,
    message: "¡Hola {cliente}! ✅ Tu cita en {negocio} ha sido confirmada para el {fecha} a las {hora}. ¡Te esperamos!"
  },
  onReschedule: {
    enabled: true,
    message: "¡Hola {cliente}! 🔄 Tu cita en {negocio} ha sido reprogramada. Nuevo horario: {fecha} a las {hora}. Especialista: {profesional}."
  },
  onCancel: {
    enabled: true,
    message: "¡Hola {cliente}! ❌ Tu cita en {negocio} para el {fecha} ha sido cancelada. Motivo: {motivo}. Esperamos verte pronto."
  },
  onReminder: {
    enabled: true,
    message: "¡Hola {cliente}! ⏰ Te recordamos tu cita de hoy en {negocio} para {servicio} a las {hora}. ¡Nos vemos pronto!"
  }
};
