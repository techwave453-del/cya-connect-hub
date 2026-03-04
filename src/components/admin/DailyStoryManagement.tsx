import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, Trash2, Star, Upload, Image as ImageIcon, Pencil, X, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface StoryPost {
  id: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  created_at: string;
  likes_count: number;
  comments_count: number;
}

const DailyStoryManagement = () => {
  const { toast } = useToast();
  const [stories, setStories] = useState<StoryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const [editingStory, setEditingStory] = useState<{ id: string; title: string; description: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStories();
    fetchSelectedStory();
  }, []);

  const fetchStories = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, description, image_url, created_at, likes_count, comments_count")
      .eq("hashtag", "#DailyBibleStory")
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) {
      setStories(data);
    }
    setLoading(false);
  };

  const fetchSelectedStory = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "selected_daily_story")
      .maybeSingle();

    if (data?.value) {
      const val = data.value as { storyId?: string };
      setSelectedStoryId(val.storyId || null);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-daily-story");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: data?.alreadyExists ? "Story Already Exists" : "Story Generated",
        description: data?.alreadyExists
          ? "A story was already generated for today."
          : `"${data?.title || 'New story'}" created successfully.`,
      });
      fetchStories();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate story";
      toast({ title: "Generation Failed", description: message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectStory = async (storyId: string) => {
    const newId = selectedStoryId === storyId ? null : storyId;

    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: "selected_daily_story", value: { storyId: newId } },
        { onConflict: "key" }
      );

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSelectedStoryId(newId);
      toast({
        title: newId ? "Story Selected" : "Selection Cleared",
        description: newId
          ? "This story will now appear on the homepage."
          : "The latest story will appear automatically.",
      });
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", storyId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Story Deleted" });
      if (selectedStoryId === storyId) {
        setSelectedStoryId(null);
        await supabase
          .from("app_settings")
          .upsert({ key: "selected_daily_story", value: { storyId: null } }, { onConflict: "key" });
      }
      fetchStories();
    }
  };

  const handleUploadImage = async (storyId: string, file: File) => {
    setUploadingImageFor(storyId);
    try {
      const timestamp = Date.now();
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `daily-story-${timestamp}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(fileName, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("post-images")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("posts")
        .update({ image_url: publicUrlData.publicUrl })
        .eq("id", storyId);

      if (updateError) throw updateError;

      toast({ title: "Image Uploaded", description: "Story image has been updated." });
      fetchStories();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      toast({ title: "Upload Failed", description: message, variant: "destructive" });
    } finally {
      setUploadingImageFor(null);
    }
  };

  const triggerFileUpload = (storyId: string) => {
    setUploadingImageFor(storyId);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && uploadingImageFor) {
      handleUploadImage(uploadingImageFor, file);
    }
    e.target.value = "";
  };

  const handleSaveEdit = async () => {
    if (!editingStory) return;
    setSavingEdit(true);
    const { error } = await supabase
      .from("posts")
      .update({ title: editingStory.title, description: editingStory.description })
      .eq("id", editingStory.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Story Updated" });
      setEditingStory(null);
      fetchStories();
    }
    setSavingEdit(false);
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Generator Card */}
      <Card className="bg-gradient-to-br from-amber-50/50 via-card to-amber-50/30 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Daily Bible Story
          </CardTitle>
          <CardDescription>
            Stories are auto-generated daily. You can also generate manually, select which story to feature, and upload images.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Story...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate New Story
              </>
            )}
          </Button>
          {generating && (
            <p className="text-sm text-muted-foreground mt-2">
              This may take 1-2 minutes as it generates the story and image...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stories List */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Bible Stories ({stories.length})</CardTitle>
          <CardDescription>
            Click the star to select which story appears on the homepage. Upload images for stories without one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : stories.length === 0 ? (
            <p className="text-muted-foreground text-sm">No stories generated yet. Click "Generate New Story" above.</p>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <div
                  key={story.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    selectedStoryId === story.id
                      ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
                      : "border-border bg-secondary/50"
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden bg-muted">
                      {story.image_url ? (
                        <img
                          src={story.image_url}
                          alt={story.title || "Story"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Info / Edit Mode */}
                    <div className="flex-1 min-w-0">
                      {editingStory?.id === story.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editingStory.title}
                            onChange={(e) => setEditingStory({ ...editingStory, title: e.target.value })}
                            placeholder="Story title"
                            className="font-semibold"
                          />
                          <Textarea
                            value={editingStory.description}
                            onChange={(e) => setEditingStory({ ...editingStory, description: e.target.value })}
                            placeholder="Story content"
                            rows={6}
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit} disabled={savingEdit} className="gap-1">
                              {savingEdit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingStory(null)} className="gap-1">
                              <X className="h-3 w-3" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <h4 className="font-semibold text-foreground truncate">
                            {story.title || "Untitled Story"}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(story.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {story.description?.substring(0, 120)}...
                          </p>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSelectStory(story.id)}
                        title={selectedStoryId === story.id ? "Deselect story" : "Feature this story"}
                        className={selectedStoryId === story.id ? "text-amber-500" : "text-muted-foreground"}
                      >
                        <Star className={`h-4 w-4 ${selectedStoryId === story.id ? "fill-current" : ""}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingStory({
                          id: story.id,
                          title: story.title || "",
                          description: story.description || "",
                        })}
                        title="Edit story"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => triggerFileUpload(story.id)}
                        disabled={uploadingImageFor === story.id}
                        title="Upload image"
                      >
                        {uploadingImageFor === story.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteStory(story.id)}
                        className="text-destructive hover:text-destructive"
                        title="Delete story"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyStoryManagement;
