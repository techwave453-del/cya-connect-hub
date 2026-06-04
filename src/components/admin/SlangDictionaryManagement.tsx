import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Languages, Pencil, X, Check } from "lucide-react";

interface SlangEntry {
  id: string;
  word: string;
  meaning: string;
  example: string | null;
  language: string;
}

const LANGS = [
  { value: "sheng", label: "Sheng" },
  { value: "sw", label: "Kiswahili" },
  { value: "en", label: "English" },
  { value: "other", label: "Other local language" },
];

const SlangDictionaryManagement = () => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<SlangEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [language, setLanguage] = useState("sheng");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<SlangEntry>>({});

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("slang_dictionary")
      .select("*")
      .order("word", { ascending: true });
    if (error) {
      toast({ title: "Error loading dictionary", description: error.message, variant: "destructive" });
      return;
    }
    setEntries((data || []) as SlangEntry[]);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async () => {
    if (!word.trim() || !meaning.trim()) {
      toast({ title: "Word and meaning are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("slang_dictionary").insert({
      word: word.trim(),
      meaning: meaning.trim(),
      example: example.trim() || null,
      language,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Word added" });
      setWord("");
      setMeaning("");
      setExample("");
      fetchEntries();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("slang_dictionary").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      fetchEntries();
    }
    setLoading(false);
  };

  const startEdit = (e: SlangEntry) => {
    setEditingId(e.id);
    setEditDraft({ word: e.word, meaning: e.meaning, example: e.example || "", language: e.language });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setLoading(true);
    const { error } = await supabase
      .from("slang_dictionary")
      .update({
        word: (editDraft.word || "").trim(),
        meaning: (editDraft.meaning || "").trim(),
        example: (editDraft.example as string)?.trim() || null,
        language: editDraft.language,
      })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated" });
      setEditingId(null);
      setEditDraft({});
      fetchEntries();
    }
    setLoading(false);
  };

  const visible = filter === "all" ? entries : entries.filter((e) => e.language === filter);

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Local Language Word
          </CardTitle>
          <CardDescription>
            Teach Scripture Guide local words (Sheng, Kiswahili, or other) so it understands and replies naturally.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Word / Phrase *</Label>
              <Input placeholder="e.g. Niaje" value={word} onChange={(e) => setWord(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label>Example (optional)</Label>
              <Input
                placeholder='e.g. "Niaje boss, uko aje?"'
                value={example}
                onChange={(e) => setExample(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Meaning *</Label>
            <Textarea
              placeholder="What does this word mean in English?"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              rows={2}
            />
          </div>
          <Button onClick={handleAdd} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Add Word
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Languages className="h-5 w-5" />
                Dictionary ({entries.length})
              </CardTitle>
              <CardDescription>Words available to the Scripture Guide AI.</CardDescription>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {LANGS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {visible.map((e) => {
              const isEditing = editingId === e.id;
              return (
                <div key={e.id} className="p-3 bg-secondary/50 rounded-lg space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <Input
                          value={editDraft.word as string}
                          onChange={(ev) => setEditDraft((d) => ({ ...d, word: ev.target.value }))}
                          placeholder="Word"
                        />
                        <Select
                          value={editDraft.language as string}
                          onValueChange={(v) => setEditDraft((d) => ({ ...d, language: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {LANGS.map((l) => (
                              <SelectItem key={l.value} value={l.value}>
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={(editDraft.example as string) || ""}
                          onChange={(ev) => setEditDraft((d) => ({ ...d, example: ev.target.value }))}
                          placeholder="Example"
                        />
                      </div>
                      <Textarea
                        value={editDraft.meaning as string}
                        onChange={(ev) => setEditDraft((d) => ({ ...d, meaning: ev.target.value }))}
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button size="sm" onClick={saveEdit} disabled={loading}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-foreground">{e.word}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary uppercase">
                            {e.language}
                          </span>
                        </div>
                        <p className="text-sm text-foreground mt-1">{e.meaning}</p>
                        {e.example && (
                          <p className="text-xs text-muted-foreground italic mt-1">"{e.example}"</p>
                        )}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(e)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(e.id)}
                          disabled={loading}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {visible.length === 0 && (
              <p className="text-muted-foreground text-sm">No words yet. Add some above.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SlangDictionaryManagement;
