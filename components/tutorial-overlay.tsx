"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePlannerStore } from "@/lib/store";

type TutorialStep = {
  title: string;
  content: string;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
};

const tutorialSteps: TutorialStep[] = [
  {
    title: "مرحباً بك في مخطط الغرف التفاعلي",
    content: "هذا التطبيق يساعدك على تصميم غرفتك بطريقة ثنائية وثلاثية الأبعاد. سنرشدك خلال الخطوات الأساسية.",
    position: "center",
  },
  {
    title: "المخطط الأرضي",
    content: "ابدأ برسم المخطط الأرضي للغرفة. استخدم أدوات الرسم لإضافة النقاط وتحريكها وحذفها. اضغط Shift للالتصاق بالشبكة.",
    position: "top-left",
  },
  {
    title: "بناء النموذج ثلاثي الأبعاد",
    content: "بعد الانتهاء من رسم المخطط، انقر على 'Build 3D' لإنشاء نموذج ثلاثي الأبعاد للغرفة.",
    position: "top-right",
  },
  {
    title: "إضافة الأثاث والديكور",
    content: "استخدم القائمة الجانبية لإضافة الأثاث والديكور إلى غرفتك. يمكنك البحث عن عناصر محددة.",
    position: "bottom-left",
  },
  {
    title: "تحريك وتدوير العناصر",
    content: "انقر على أي عنصر لتحديده، ثم استخدم أدوات التحويل لتحريكه أو تدويره أو تغيير حجمه.",
    position: "bottom-right",
  },
  {
    title: "حفظ وتحميل التصميمات",
    content: "يمكنك حفظ تصميمك كملف JSON وإعادة تحميله لاحقاً. استمتع بالتصميم!",
    position: "center",
  },
];

export function TutorialOverlay() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasSeenTutorial, setHasSeenTutorial] = useState(false);
  const tab = usePlannerStore((s) => s.tab);

  useEffect(() => {
    // Check if user has seen the tutorial before
    const tutorialSeen = localStorage.getItem("next3d_tutorial_seen");
    if (!tutorialSeen) {
      setShowTutorial(true);
    } else {
      setHasSeenTutorial(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setShowTutorial(false);
    setHasSeenTutorial(true);
    localStorage.setItem("next3d_tutorial_seen", "true");
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setShowTutorial(true);
  };

  if (!showTutorial) {
    return hasSeenTutorial ? (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-50 bg-white/80 backdrop-blur-sm"
        onClick={handleRestart}
      >
        إظهار الإرشادات
      </Button>
    ) : null;
  }

  const step = tutorialSteps[currentStep];
  const positionClasses = {
    "center": "fixed inset-0 flex items-center justify-center z-50",
    "top-left": "fixed top-20 left-20 z-50",
    "top-right": "fixed top-20 right-20 z-50",
    "bottom-left": "fixed bottom-20 left-20 z-50",
    "bottom-right": "fixed bottom-20 right-20 z-50",
  };

  return (
    <div className={positionClasses[step.position]}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={handleClose} />
      <Card className="p-6 max-w-md relative z-10 bg-white/90 backdrop-blur-md shadow-xl">
        <h2 className="text-xl font-bold mb-2 text-right">{step.title}</h2>
        <p className="mb-4 text-right">{step.content}</p>
        <div className="flex justify-between">
          <Button variant="outline" size="sm" onClick={handleClose}>
            إغلاق
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                السابق
              </Button>
            )}
            <Button size="sm" onClick={handleNext}>
              {currentStep < tutorialSteps.length - 1 ? "التالي" : "إنهاء"}
            </Button>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {currentStep + 1} من {tutorialSteps.length}
        </div>
      </Card>
    </div>
  );
}