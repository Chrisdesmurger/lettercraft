"use client";

import React from "react";
import { Lightbulb } from "lucide-react";
import TipsCarousel from "./TipsCarousel";
import { useI18n } from "@/lib/i18n-context";

interface HomeTipsCarouselProps {
  className?: string;
}

export default function HomeTipsCarousel({ className }: HomeTipsCarouselProps) {
  const { t } = useI18n();

  return (
    <div className={className}>
      <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg">
            <Lightbulb className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {t("tips.title")}
            </h2>
            <p className="text-sm text-gray-600">{t("tips.subtitle")}</p>
          </div>
        </div>

        <TipsCarousel
          mode="random"
          count={3}
          autoplay={true}
          autoplayDelay={6000}
          showControls={true}
          showIndicators={true}
          className="mt-4"
        />
      </div>
    </div>
  );
}
