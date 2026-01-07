import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Loader2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BibleGame } from "@/hooks/useBibleGames";

const AdminGameManagement = () => {
  const [games, setGames] = useState<BibleGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<BibleGame | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    game_type: 'trivia' as BibleGame['game_type'],
    question: '',
    options: ['', '', '', ''],
    correct_answer: '',
    hint: '',
    difficulty: 'medium' as BibleGame['difficulty'],
    bible_reference: '',
    points: 10,
    is_active: true
  });

  const fetchGames = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bible_games')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setGames(data.map(game => ({
          ...game,
          options: game.options as string[] | null,
          game_type: game.game_type as BibleGame['game_type'],
          difficulty: game.difficulty as BibleGame['difficulty']
        })));
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      toast({
        title: "Error",
        description: "Failed to load games",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const resetForm = () => {
    setFormData({
      game_type: 'trivia',
      question: '',
      options: ['', '', '', ''],
      correct_answer: '',
      hint: '',
      difficulty: 'medium',
      bible_reference: '',
      points: 10,
      is_active: true
    });
    setEditingGame(null);
  };

  const handleEdit = (game: BibleGame) => {
    setEditingGame(game);
    setFormData({
      game_type: game.game_type,
      question: game.question,
      options: game.options || ['', '', '', ''],
      correct_answer: game.correct_answer,
      hint: game.hint || '',
      difficulty: game.difficulty,
      bible_reference: game.bible_reference || '',
      points: game.points,
      is_active: game.is_active
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;

    try {
      const { error } = await supabase
        .from('bible_games')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Game deleted successfully"
      });
      fetchGames();
    } catch (error) {
      console.error('Error deleting game:', error);
      toast({
        title: "Error",
        description: "Failed to delete game",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const gameData = {
        game_type: formData.game_type,
        question: formData.question,
        options: formData.options.filter(o => o.trim() !== ''),
        correct_answer: formData.correct_answer,
        hint: formData.hint || null,
        difficulty: formData.difficulty,
        bible_reference: formData.bible_reference || null,
        points: formData.points,
        is_active: formData.is_active
      };

      if (editingGame) {
        const { error } = await supabase
          .from('bible_games')
          .update(gameData)
          .eq('id', editingGame.id);

        if (error) throw error;
        toast({ title: "Updated", description: "Game updated successfully" });
      } else {
        const { error } = await supabase
          .from('bible_games')
          .insert(gameData);

        if (error) throw error;
        toast({ title: "Created", description: "Game created successfully" });
      }

      setDialogOpen(false);
      resetForm();
      fetchGames();
    } catch (error) {
      console.error('Error saving game:', error);
      toast({
        title: "Error",
        description: "Failed to save game",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData({ ...formData, options: newOptions });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bible Games ({games.length})</h2>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Game
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingGame ? 'Edit Game' : 'Add New Game'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Game Type</Label>
                  <Select
                    value={formData.game_type}
                    onValueChange={(value: BibleGame['game_type']) => 
                      setFormData({ ...formData, game_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trivia">Trivia</SelectItem>
                      <SelectItem value="guess_character">Guess Character</SelectItem>
                      <SelectItem value="fill_blank">Fill in Blank</SelectItem>
                      <SelectItem value="memory_verse">Memory Verse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: BibleGame['difficulty']) => 
                      setFormData({ ...formData, difficulty: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Options (for multiple choice)</Label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <Input
                      key={index}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Correct Answer</Label>
                <Input
                  value={formData.correct_answer}
                  onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bible Reference</Label>
                  <Input
                    value={formData.bible_reference}
                    onChange={(e) => setFormData({ ...formData, bible_reference: e.target.value })}
                    placeholder="e.g., John 3:16"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Points</Label>
                  <Input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 10 })}
                    min={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hint (optional)</Label>
                <Input
                  value={formData.hint}
                  onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  {editingGame ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {games.map((game) => (
          <Card key={game.id} className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      {game.game_type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      game.difficulty === 'easy' ? 'bg-green-500/20 text-green-500' :
                      game.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-red-500/20 text-red-500'
                    }`}>
                      {game.difficulty}
                    </span>
                    {!game.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-sm font-medium line-clamp-2">
                    {game.question}
                  </CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => handleEdit(game)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(game.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground">
                Answer: {game.correct_answer} • {game.points} pts
                {game.bible_reference && ` • ${game.bible_reference}`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default AdminGameManagement;
