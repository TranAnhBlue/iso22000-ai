import { useState } from "react";
import { Sparkles, Send, X, Bot } from "lucide-react";

interface Msg {
  role: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "Gợi ý dàn ý SOP kiểm soát nguyên liệu theo ISO 22000",
  "Phân tích mối nguy CCP cho công đoạn gia nhiệt",
  "Đề xuất CAPA cho lỗi vượt giới hạn tới hạn",
  "Tổng hợp báo cáo đánh giá nội bộ quý này",
];

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text:
        "Xin chào! Tôi là trợ lý AI ISO 22000 của WCERT. Tôi có thể giúp bạn soạn SOP, phân tích mối nguy HACCP, gợi ý CAPA, và tổng hợp báo cáo. Bạn cần hỗ trợ gì hôm nay?",
    },
  ]);

  const send = (q?: string) => {
    const text = (q ?? input).trim();
    if (!text) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          role: "ai",
          text: aiMock(text),
        },
      ]);
    }, 600);
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-105"
        >
          <Sparkles className="h-4 w-4" /> Trợ lý AI
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-40 flex h-[560px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-primary to-accent px-4 py-3 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">WCERT AI Assistant</div>
                <div className="text-[11px] opacity-80">ISO 22000:2018 expert</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {msgs.length <= 1 && (
              <div className="space-y-1.5 pt-2">
                <div className="text-xs font-medium text-muted-foreground">Gợi ý câu hỏi:</div>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-lg border bg-background px-3 py-2 text-left text-xs hover:border-primary hover:bg-primary/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 border-t bg-background p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Hỏi AI về ISO 22000..."
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
            <button
              onClick={() => send()}
              className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground hover:opacity-90"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function aiMock(q: string): string {
  const k = q.toLowerCase();
  if (k.includes("sop") || k.includes("dàn ý"))
    return "Dàn ý SOP đề xuất (ISO 22000:2018):\n1. Mục đích & Phạm vi\n2. Tài liệu viện dẫn\n3. Định nghĩa\n4. Trách nhiệm\n5. Nội dung quy trình (lưu đồ)\n6. Hồ sơ ghi chép\n7. Kiểm soát thay đổi\n\nTôi đã phát hiện 2 thuật ngữ chưa chuẩn — xem panel đề xuất.";
  if (k.includes("ccp") || k.includes("mối nguy") || k.includes("gia nhiệt"))
    return "Phân tích CCP – Công đoạn Gia nhiệt:\n• Mối nguy: Salmonella, Listeria (Sinh học)\n• CL gợi ý: ≥ 75°C tâm sản phẩm, ≥ 15 giây\n• Giám sát: nhiệt kế đã hiệu chuẩn, mỗi mẻ\n• Hành động khắc phục: tái chế hoặc loại bỏ lô\n\nKhuyến nghị: gắn cảm biến IoT để cảnh báo realtime.";
  if (k.includes("capa") || k.includes("khắc phục"))
    return "Đề xuất CAPA dựa trên dữ liệu quá khứ:\n• Nguyên nhân gốc rễ (5-Why): Thiếu đào tạo vận hành\n• Hành động khắc phục: Tái đào tạo + cập nhật WI-PRD-03\n• Hành động phòng ngừa: Kiểm tra hiệu lực sau 30 ngày\n• Đã phát hiện 3 NC tương tự trong 6 tháng — cần ưu tiên xử lý.";
  if (k.includes("báo cáo") || k.includes("đánh giá nội bộ"))
    return "Tổng hợp ĐGNB quý này:\n• 12 cuộc đánh giá hoàn thành (100% kế hoạch)\n• 27 NC: 18 Minor / 7 Major / 2 Critical\n• 84% CAPA đóng đúng hạn\n• Xu hướng: NC về vệ sinh cá nhân giảm 23%, cần chú ý mảng kiểm soát côn trùng.";
  return "Tôi đã ghi nhận yêu cầu. Dựa trên ngữ cảnh ISO 22000:2018, tôi sẽ phân tích dữ liệu nội bộ và trả về đề xuất chi tiết. (Bản demo: kết nối Lovable AI để bật phản hồi đầy đủ.)";
}
