import { useState, useCallback } from 'react';
import { generateFallbackResponse } from '@/lib/fallbackChat';

type Message = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bible-chat`;

export const useBibleChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
 
  const sendMessage = useCallback(async (input: string, options?: { suppressUser?: boolean }) => {
    if (!input.trim() || isLoading) return;

    const suppressUser = !!options?.suppressUser;
    const userMsg: Message = { role: 'user', content: input };
    let addedUser = false;
    if (!suppressUser) {
      setMessages(prev => [...prev, userMsg]);
      addedUser = true;
    }
    setIsLoading(true);
    setError(null);

    let assistantSoFar = '';

    const upsertAssistant = (nextChunk: string) => {
      assistantSoFar += nextChunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    const MAX_RETRIES = 3;
    const fetchWithRetry = async (allMessages: Message[], attempt = 0): Promise<Response> => {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (resp.status === 429 && attempt < MAX_RETRIES) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(allMessages, attempt + 1);
      }

      return resp;
    };
 
     try {
       const allMessages = [...messages, userMsg];
       const resp = await fetchWithRetry(allMessages);
 
       if (!resp.ok || !resp.body) {
         if (resp.status === 429) {
           throw new Error('Rate limit reached. Please wait a moment and try again.');
         }
         if (resp.status === 402) {
           throw new Error('AI service temporarily unavailable.');
         }
         throw new Error('Failed to get response');
       }
 
       const reader = resp.body.getReader();
       const decoder = new TextDecoder();
       let textBuffer = '';
       let streamDone = false;
 
       while (!streamDone) {
         const { done, value } = await reader.read();
         if (done) break;
         textBuffer += decoder.decode(value, { stream: true });
 
         let newlineIndex: number;
         while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
           let line = textBuffer.slice(0, newlineIndex);
           textBuffer = textBuffer.slice(newlineIndex + 1);
 
           if (line.endsWith('\r')) line = line.slice(0, -1);
           if (line.startsWith(':') || line.trim() === '') continue;
           if (!line.startsWith('data: ')) continue;
 
           const jsonStr = line.slice(6).trim();
           if (jsonStr === '[DONE]') {
             streamDone = true;
             break;
           }
 
           try {
             const parsed = JSON.parse(jsonStr);
             const content = parsed.choices?.[0]?.delta?.content as string | undefined;
             if (content) upsertAssistant(content);
           } catch {
             textBuffer = line + '\n' + textBuffer;
             break;
           }
         }
       }
 
       // Flush remaining buffer
       if (textBuffer.trim()) {
         for (let raw of textBuffer.split('\n')) {
           if (!raw) continue;
           if (raw.endsWith('\r')) raw = raw.slice(0, -1);
           if (raw.startsWith(':') || raw.trim() === '') continue;
           if (!raw.startsWith('data: ')) continue;
           const jsonStr = raw.slice(6).trim();
           if (jsonStr === '[DONE]') continue;
           try {
             const parsed = JSON.parse(jsonStr);
             const content = parsed.choices?.[0]?.delta?.content as string | undefined;
             if (content) upsertAssistant(content);
           } catch { /* ignore */ }
         }
       }
    } catch (e) {
      console.error('Bible chat error:', e);
      
      // ── Fallback: try local AI / Bible search ──
      try {
        console.log('[useBibleChat] Cloud AI failed, trying fallback...');
        setIsOfflineMode(true);
        const fallback = await generateFallbackResponse(input);
        upsertAssistant(fallback.content);
        console.log(`[useBibleChat] Fallback source: ${fallback.source}`);
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
        setError(e instanceof Error ? e.message : 'Failed to get response');
        if (addedUser) {
          setMessages(prev => prev.filter(m => m !== userMsg));
        }
      }
    } finally {
      setIsLoading(false);
    }
   }, [messages, isLoading]);

  const generateInsight = useCallback(async (prompt: string): Promise<string | null> => {
    const MAX_RETRIES = 3;
    const fetchWithRetry = async (attempt = 0): Promise<Response> => {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      });
      if (resp.status === 429 && attempt < MAX_RETRIES) {
        const delay = Math.min(2000 * Math.pow(2, attempt), 10000);
        console.log(`Rate limited (insight), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await new Promise(r => setTimeout(r, delay));
        return fetchWithRetry(attempt + 1);
      }
      return resp;
    };

    try {
      const resp = await fetchWithRetry();

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantSoFar = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) assistantSoFar += content;
          } catch { /* ignore */ }
        }
      }

      return assistantSoFar;
    } catch (e) {
      console.error('generateInsight error:', e);
      return null;
    }
  }, []);
 
    const clearChat = useCallback(() => {
      setMessages([]);
      setError(null);
    }, []);

    const loadMessages = useCallback((msgs: Message[]) => {
      setMessages(msgs);
      setError(null);
    }, []);

    return { messages, isLoading, error, isOfflineMode, sendMessage, clearChat, loadMessages, generateInsight };
  };