import { signInWithGoogle } from "./actions";
import { Button } from "@/components/ui";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      <Button type="submit" variant="secondary" className="w-full">
        Continuar com Google
      </Button>
    </form>
  );
}
