"use client";
import toast from "react-hot-toast";

export interface Step3Data {
  firstName: string;
  email: string;
  newsletter?: boolean;
  tips?: boolean;
}

interface Props {
  data: Step3Data;
  onBack: () => void;
  onFinish: () => void;
}

export default function Step3({ data, onBack, onFinish }: Props) {
  const handleFinish = () => {
    toast.success(`Bienvenue ${data.firstName} !`);
    onFinish();
  };
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Confirmation</h2>
      <p className="text-gray-700">
        Merci {data.firstName} ({data.email}).
      </p>
      <p className="text-gray-700">Pr\u00e9f\u00e9rences :</p>
      <ul className="list-disc pl-6 text-gray-700">
        <li>
          {data.newsletter
            ? "Inscrit \u00e0 la newsletter"
            : "Pas de newsletter"}
        </li>
        <li>{data.tips ? "Recevoir des astuces" : "Pas d\u2019astuces"}</li>
      </ul>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded bg-gray-200"
        >
          Pr\u00e9c\u00e9dent
        </button>
        <button
          type="button"
          onClick={handleFinish}
          className="px-4 py-2 rounded bg-gradient-to-r from-orange-400 to-amber-500 text-white"
        >
          Terminer
        </button>
      </div>
    </div>
  );
}
