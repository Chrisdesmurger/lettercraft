"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const schema = z.object({
  newsletter: z.boolean().optional(),
  tips: z.boolean().optional(),
});
export type Step2Data = z.infer<typeof schema>;

interface Props {
  defaultValues: Step2Data;
  onNext: (data: Step2Data) => void;
  onBack: () => void;
}

export default function Step2({ defaultValues, onNext, onBack }: Props) {
  const { register, handleSubmit } = useForm<Step2Data>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onNext)} className="space-y-4">
      <div className="space-y-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            {...register("newsletter")}
            className="h-4 w-4"
          />
          <span>S\u2019abonner \u00e0 la newsletter</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" {...register("tips")} className="h-4 w-4" />
          <span>Recevoir des astuces personnalis\u00e9es</span>
        </label>
      </div>
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 rounded bg-gray-200"
        >
          Pr\u00e9c\u00e9dent
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-gradient-to-r from-orange-400 to-amber-500 text-white"
        >
          Suivant
        </button>
      </div>
    </form>
  );
}
