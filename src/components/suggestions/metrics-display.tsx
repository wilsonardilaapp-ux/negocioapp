
"use client";

import { useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { BadgeDollarSign, BarChart, CheckCircle, Percent, Loader2 } from "lucide-react";
import type { SuggestionRule } from "@/models/suggestion-rule";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
    }).format(value);
};

interface MetricsDisplayProps {
    rules: SuggestionRule[];
    isLoading: boolean;
}

export default function MetricsDisplay({ rules, isLoading }: MetricsDisplayProps) {
    const metricsData = useMemo(() => {
        if (!rules) {
            return {
                totalRevenue: 0,
                totalTimesShown: 0,
                totalTimesAccepted: 0,
                overallConversionRate: 0,
            };
        }
        const totalRevenue = rules.reduce((acc, rule) => acc + (rule.metrics?.revenueGenerated || 0), 0);
        const totalTimesShown = rules.reduce((acc, rule) => acc + (rule.metrics?.timesShown || 0), 0);
        const totalTimesAccepted = rules.reduce((acc, rule) => acc + (rule.metrics?.timesAccepted || 0), 0);
        const overallConversionRate = totalTimesShown > 0 ? (totalTimesAccepted / totalTimesShown) * 100 : 0;

        return { totalRevenue, totalTimesShown, totalTimesAccepted, overallConversionRate };
    }, [rules]);

    const metricsCards = [
        { title: "Ingresos Atribuidos", value: formatCurrency(metricsData.totalRevenue), icon: BadgeDollarSign },
        { title: "Tasa de Conversión General", value: `${metricsData.overallConversionRate.toFixed(1)}%`, icon: Percent },
        { title: "Sugerencias Mostradas", value: metricsData.totalTimesShown, icon: BarChart },
        { title: "Sugerencias Aceptadas", value: metricsData.totalTimesAccepted, icon: CheckCircle },
    ];

    return (
        <div className="space-y-6">
            {metricsCards.map(metric => (
                <Card key={metric.title}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                        <metric.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                             <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="text-muted-foreground text-sm">...</span>
                            </div>
                        ) : (
                             <div className="text-2xl font-bold">{metric.value}</div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
