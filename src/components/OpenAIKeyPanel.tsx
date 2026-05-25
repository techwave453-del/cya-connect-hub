import { useEffect, useState } from "react";
import { Sparkles, Eye, EyeOff, Loader2, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const OpenAIKeyPanel = () => {
  const { user } = useAuth();
  const [key, setKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("user_api_keys")
        .select("openai_api_key")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.openai_api_key) {
        setHasKey(true);
        setKey(data.openai_api_key);
      }
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!key.startsWith("sk-")) {
      toast({ title: "Invalid key", description: "OpenAI keys start with 'sk-'", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("user_api_keys")
      .upsert({ user_id: user.id, openai_api_key: key }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setHasKey(true);
    toast({ title: "Saved ✨", description: "Scripture Guide will now use your ChatGPT key." });
  };

  const remove = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("user_api_keys").delete().eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    setKey("");
    setHasKey(false);
    toast({ title: "Removed", description: "Reverted to the built-in AI." });
  };

  return (
    <div className="bg-card rounded-xl p-5 card-shadow">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="font-heading text-lg font-semibold">ChatGPT Integration</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Scripture Guide is powered by GPT out of the box. Optionally connect your own OpenAI key to use your personal ChatGPT account — no shared rate limits.
      </p>

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={show ? "text" : "password"}
                placeholder="sk-..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={save} disabled={saving || !key} className="bg-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : hasKey ? "Update" : "Save"}
            </Button>
          </div>

          {hasKey && (
            <Button variant="ghost" size="sm" onClick={remove} disabled={saving} className="text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Remove key
            </Button>
          )}

          <a
            href="https://platform.openai.com/api-keys"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Get an OpenAI API key <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};

export default OpenAIKeyPanel;
