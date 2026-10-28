"use client";
import { useActionState, useState } from "react";
import { saveExercise } from "@/lib/actions/exercises";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";
import { EXERCISE_TYPE_LABELS } from "@/lib/types";
import { VIDEO_MAX_BYTES, VIDEO_TYPES } from "@/lib/video";
import { FormMessage, SubmitButton } from "./form";
import { Field, Input, Select, Textarea } from "./ui";

export function ExerciseForm({ exercise, userId }: { exercise?: Exercise; userId: string }) {
  const [state, action] = useActionState(saveExercise, undefined);
  const [video, setVideo] = useState(exercise?.video_url ?? "");
  const [upload, setUpload] = useState<{ busy: boolean; error?: string }>({ busy: false });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!VIDEO_TYPES.includes(file.type)) return setUpload({ busy: false, error: "Use MP4 ou WebM." });
    if (file.size > VIDEO_MAX_BYTES) return setUpload({ busy: false, error: "Máximo de 50 MB." });
    setUpload({ busy: true });
    const supabase = createClient();
    const path = `${userId}/${crypto.randomUUID()}.${file.type === "video/webm" ? "webm" : "mp4"}`;
    const { error } = await supabase.storage.from("exercise-videos").upload(path, file, { contentType: file.type });
    if (error) return setUpload({ busy: false, error: error.message });
    setVideo(supabase.storage.from("exercise-videos").getPublicUrl(path).data.publicUrl);
    setUpload({ busy: false });
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {exercise && <input type="hidden" name="$id" value={exercise.id} />}
      <Field label="Nome">
        <Input name="name" defaultValue={exercise?.name} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo">
          <Select name="type" defaultValue={exercise?.type ?? "musculacao"}>
            {Object.entries(EXERCISE_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </Select>
        </Field>
        <Field label="Grupo muscular">
          <Input name="muscle_group" defaultValue={exercise?.muscle_group ?? ""} />
        </Field>
      </div>
      <Field label="Equipamento">
        <Input name="equipment" defaultValue={exercise?.equipment ?? ""} />
      </Field>
      <fieldset className="grid grid-cols-3 gap-2 rounded-2xl border border-border p-3">
        <legend className="px-1 text-sm font-medium">MET (opcional)</legend>
        <Field label="Leve"><Input name="met_light" type="number" step="0.1" defaultValue={exercise?.met_light ?? ""} placeholder="3.5" /></Field>
        <Field label="Moderado"><Input name="met_moderate" type="number" step="0.1" defaultValue={exercise?.met_moderate ?? ""} placeholder="5.0" /></Field>
        <Field label="Vigoroso"><Input name="met_vigorous" type="number" step="0.1" defaultValue={exercise?.met_vigorous ?? ""} placeholder="6.0" /></Field>
      </fieldset>
      <Field label="Instruções">
        <Textarea name="instructions" defaultValue={exercise?.instructions ?? ""} />
      </Field>
      <Field label="Vídeo" hint="Link do YouTube ou envie um arquivo MP4/WebM (até 50 MB).">
        <Input name="video_url" type="url" value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtu.be/…" />
      </Field>
      <input type="file" accept="video/mp4,video/webm" onChange={onFile} className="text-sm" disabled={upload.busy} />
      {upload.busy && <p className="text-sm text-muted">Enviando vídeo…</p>}
      {upload.error && <p className="text-sm text-danger">{upload.error}</p>}
      <SubmitButton>Salvar exercício</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
