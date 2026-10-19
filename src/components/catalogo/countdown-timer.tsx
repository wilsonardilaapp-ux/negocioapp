"use client";

import React, { useState, useEffect } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  targetDate: string;
  variant?: "badge" | "compact" | "full";
  className?: string;
  onExpire?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export function CountdownTimer({ targetDate, variant = "compact", className = "", onExpire }: CountdownTimerProps) {
  const calculateTimeRemaining = (): TimeRemaining => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const normalizedDate = targetDate.includes("T") ? targetDate : targetDate + "T23:59:59";
    const targetMs = new Date(normalizedDate).getTime();
    const difference = targetMs - Date.now();

    if (isNaN(difference) || difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(calculateTimeRemaining);

  useEffect(() => {
    const timer = setInterval(() => {
      const updated = calculateTimeRemaining();
      setTimeLeft(updated);
      if (updated.isExpired) {
        clearInterval(timer);
        if (onExpire) onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.isExpired) return null;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const isUrgent = timeLeft.days === 0;

  // 1. VARIANTE BADGE (sobre la imagen del producto)
  if (variant === "badge") {
    return (
      <div className={"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold shadow-md border " + (isUrgent ? "border-red-400/50" : "border-white/20") + " select-none " + className}>
        <Clock className={"w-3 h-3 " + (isUrgent ? "text-red-400 animate-ping" : "text-emerald-400 animate-pulse")} />
        <span className={isUrgent ? "text-red-300" : "text-white"}>
          {timeLeft.days > 0 ? timeLeft.days + "d " : ""}
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    );
  }

  // 2. VARIANTE COMPACT (zona de precio de la tarjeta)
  if (variant === "compact") {
    return (
      <div className={"flex flex-col gap-1 py-1 select-none " + className}>
        <div className={"flex items-center gap-1 text-[11px] font-semibold " + (isUrgent ? "text-red-600" : "text-emerald-700")}>
          <Clock className={"w-3.5 h-3.5 " + (isUrgent ? "text-red-600 animate-bounce" : "text-emerald-600 animate-pulse")} />
          <span>{isUrgent ? "¡Últimas horas!" : "Oferta termina en:"}</span>
        </div>
        <div className="flex items-center gap-1">
          {timeLeft.days > 0 && (
            <span className="flex items-center gap-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded px-1.5 py-0.5 text-xs font-black">
              {timeLeft.days}<span className="text-[10px] text-emerald-600 font-medium">d</span>
            </span>
          )}
          <span className={"flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-black " + (isUrgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200/60")}>
            {pad(timeLeft.hours)}<span className={"text-[10px] font-medium " + (isUrgent ? "text-red-500" : "text-emerald-600")}>h</span>
          </span>
          <span className={(isUrgent ? "text-red-500" : "text-emerald-500") + " font-bold"}>:</span>
          <span className={"flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-black " + (isUrgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200/60")}>
            {pad(timeLeft.minutes)}<span className={"text-[10px] font-medium " + (isUrgent ? "text-red-500" : "text-emerald-600")}>m</span>
          </span>
          <span className={(isUrgent ? "text-red-500" : "text-emerald-500") + " font-bold"}>:</span>
          <span className={"flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-black " + (isUrgent ? "bg-red-50 text-red-700 border border-red-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200/60")}>
            {pad(timeLeft.seconds)}<span className={"text-[10px] font-medium " + (isUrgent ? "text-red-500" : "text-emerald-600")}>s</span>
          </span>
        </div>
      </div>
    );
  }

  // 3. VARIANTE FULL (modal de detalle de producto "Ver")
  return (
    <div className={"p-4 rounded-xl border shadow-sm space-y-2 select-none transition-colors duration-300 " + (isUrgent ? "border-red-200 bg-gradient-to-br from-red-50/70 via-red-50/30 to-white" : "border-emerald-200/80 bg-gradient-to-br from-emerald-50/60 via-emerald-50/30 to-white") + " " + className}>
      <div className="flex items-center justify-between text-xs font-bold">
        <span className={"flex items-center gap-1.5 " + (isUrgent ? "text-red-800" : "text-emerald-800")}>
          <Clock className={"w-4 h-4 " + (isUrgent ? "text-red-600 animate-bounce" : "text-emerald-600 animate-pulse")} />
          OFERTA POR TIEMPO LIMITADO
        </span>
        <span className={"text-[11px] " + (isUrgent ? "font-bold text-red-600 animate-pulse" : "font-semibold text-emerald-600")}>
          {isUrgent ? "¡Termina pronto!" : "No te lo pierdas"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className={"bg-white border rounded-lg p-2 shadow-xs " + (isUrgent ? "border-red-200" : "border-emerald-200/60")}>
          <span className={"block text-xl md:text-2xl font-black tabular-nums " + (isUrgent ? "text-red-600" : "text-emerald-700")}>
            {timeLeft.days}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Días</span>
        </div>
        <div className={"bg-white border rounded-lg p-2 shadow-xs " + (isUrgent ? "border-red-200" : "border-emerald-200/60")}>
          <span className={"block text-xl md:text-2xl font-black tabular-nums " + (isUrgent ? "text-red-600" : "text-emerald-700")}>
            {pad(timeLeft.hours)}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Horas</span>
        </div>
        <div className={"bg-white border rounded-lg p-2 shadow-xs " + (isUrgent ? "border-red-200" : "border-emerald-200/60")}>
          <span className={"block text-xl md:text-2xl font-black tabular-nums " + (isUrgent ? "text-red-600" : "text-emerald-700")}>
            {pad(timeLeft.minutes)}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Min</span>
        </div>
        <div className={"bg-white border rounded-lg p-2 shadow-xs " + (isUrgent ? "border-red-200" : "border-emerald-200/60")}>
          <span className={"block text-xl md:text-2xl font-black tabular-nums " + (isUrgent ? "text-red-600" : "text-emerald-700")}>
            {pad(timeLeft.seconds)}
          </span>
          <span className="block text-[10px] uppercase font-bold text-gray-500 tracking-wider">Seg</span>
        </div>
      </div>
    </div>
  );
}

export default CountdownTimer;
