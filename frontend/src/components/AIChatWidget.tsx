import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Minus,
  Maximize2,
  Minimize2,
  RotateCcw,
  Copy,
  Check,
  Bot,
  User,
  ChevronUp,
  MessageSquare,
  FileCheck,
  ShieldAlert,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";
import logoImg from "@/assets/logo.png";

interface Msg {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: string;
}

type WidgetState = "closed" | "minimized" | "open" | "expanded";

const SUGGESTIONS = [
  {
    icon: FileCheck,
    label: "Dàn ý SOP kiểm soát nguyên vật liệu",
    query: "Gợi ý dàn ý SOP kiểm soát nguyên liệu theo ISO 22000:2018",
  },
  {
    icon: ShieldAlert,
    label: "Phân tích mối nguy CCP gia nhiệt",
    query: "Phân tích mối nguy CCP cho công đoạn gia nhiệt tiệt trùng",
  },
  {
    icon: AlertTriangle,
    label: "Đề xuất CAPA lỗi lệch ngưỡng",
    query: "Đề xuất quy trình CAPA cho lỗi vượt giới hạn tới hạn CCP",
  },
  {
    icon: ClipboardList,
    label: "Checklist đánh giá nội bộ FSMS",
    query: "Tổng hợp checklist đánh giá nội bộ ISO 22000 theo điều khoản 9.2",
  },
];

export function AIChatWidget() {
  const [widgetState, setWidgetState] = useState<WidgetState>("closed");
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: "msg-welcome",
      role: "ai",
      text: "Xin chào! Tôi là Trợ lý AI ISO 22000 & HACCP của WCERT. Tôi có thể hỗ trợ bạn soạn thảo SOP, thiết lập CCP/oPRP, gợi ý hành động khắc phục CAPA và rà soát tuân thủ tiêu chuẩn. Bạn cần hỗ trợ gì?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (widgetState === "open" || widgetState === "expanded") {
      scrollToBottom();
    }
  }, [msgs, isTyping, widgetState]);

  const send = (q?: string) => {
    const text = (q ?? input).trim();
    if (!text) return;

    const userMsg: Msg = {
      id: `user-${Date.now()}`,
      role: "user",
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const aiResponseText = aiMock(text);
      const aiMsg: Msg = {
        id: `ai-${Date.now()}`,
        role: "ai",
        text: aiResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMsgs((m) => [...m, aiMsg]);
      setIsTyping(false);
    }, 700);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMsgs([
      {
        id: "msg-welcome",
        role: "ai",
        text: "Hội thoại đã được làm mới. Tôi sẵn sàng hỗ trợ bạn về các yêu cầu ISO 22000, HACCP, PRP/SSOP.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6 font-sans">
      {/* 1. TRẠNG THÁI NÚT TRÒN GỌN NHẸ (CLOSED) */}
      {widgetState === "closed" && (
        <div className="group relative flex items-center justify-end">
          {/* Tooltip hiển thị khi hover */}
          <div className="pointer-events-none absolute right-14 mr-2 hidden whitespace-nowrap rounded-lg border bg-popover px-3 py-1.5 text-xs font-medium text-popover-foreground shadow-md transition-all duration-200 group-hover:block animate-in fade-in slide-in-from-right-2">
            ✨ Trợ lý AI ISO 22000
          </div>

          <button
            onClick={() => setWidgetState("open")}
            aria-label="Mở Trợ lý AI"
            className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-primary/90 to-accent text-primary-foreground shadow-xl shadow-primary/30 transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
          </button>
        </div>
      )}

      {/* 2. TRẠNG THÁI RÚT GỌN / THU NHỎ DƯỚI GÓC MÀN HÌNH (MINIMIZED) */}
      {widgetState === "minimized" && (
        <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-background/95 px-3.5 py-2 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-primary/40 animate-in fade-in slide-in-from-bottom-3">
          <button
            onClick={() => setWidgetState("open")}
            className="flex items-center gap-2 text-xs font-semibold text-foreground hover:text-primary transition"
          >
            <div className="relative flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Bot className="h-3.5 w-3.5" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <span>Trợ lý AI (Đang ẩn)</span>
            <span className="text-[10px] text-muted-foreground">({msgs.length} tin nhắn)</span>
          </button>

          <div className="flex items-center gap-1 border-l pl-2">
            <button
              onClick={() => setWidgetState("open")}
              title="Mở rộng cửa sổ chat"
              className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setWidgetState("closed")}
              title="Đóng hoàn toàn"
              className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 3. TRẠNG THÁI MỞ CỬA SỔ CHAT (OPEN HOẶC EXPANDED) */}
      {(widgetState === "open" || widgetState === "expanded") && (
        <div
          className={`flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in zoom-in-95 ${
            widgetState === "expanded"
              ? "h-[85vh] w-[90vw] max-w-3xl sm:h-[680px]"
              : "h-[540px] w-[360px] max-w-[calc(100vw-1.5rem)] sm:w-[390px]"
          }`}
        >
          {/* Header Thanh tiêu đề & các nút điều khiển */}
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-primary via-primary/95 to-accent px-4 py-3 text-primary-foreground shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white p-0.5 shadow-sm ring-2 ring-white/30">
                <img
                  src={logoImg}
                  alt="WCERT Logo"
                  className="h-7 w-7 rounded-full object-contain"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold sm:text-sm">
                  <span>WCERT AI Expert</span>
                  <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[9px] font-normal backdrop-blur-sm">
                    ISO 22000
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] opacity-85">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Sẵn sàng hỗ trợ 24/7</span>
                </div>
              </div>
            </div>

            {/* Bộ nút điều khiển góc phải: Làm mới, Thu nhỏ, Mở rộng, Đóng */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Làm mới hội thoại"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setWidgetState("minimized")}
                title="Thu nhỏ thanh tác vụ"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() =>
                  setWidgetState(widgetState === "expanded" ? "open" : "expanded")
                }
                title={widgetState === "expanded" ? "Thu về kích thước chuẩn" : "Phóng to cửa sổ"}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                {widgetState === "expanded" ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                onClick={() => setWidgetState("closed")}
                title="Đóng widget"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Vùng Tin nhắn Cuộn */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-3.5 text-xs sm:p-4">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "ai" && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Bot className="h-4 w-4" />
                  </div>
                )}

                <div
                  className={`group relative max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-card border border-border/80 text-foreground rounded-tl-sm"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                  <div
                    className={`mt-1 flex items-center justify-between text-[10px] ${
                      m.role === "user" ? "text-primary-foreground/75" : "text-muted-foreground"
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {m.role === "ai" && (
                      <button
                        onClick={() => handleCopy(m.id, m.text)}
                        title="Copy phản hồi"
                        className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      >
                        {copiedId === m.id ? (
                          <Check className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {m.role === "user" && (
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-muted border text-muted-foreground">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Hiệu ứng gõ chữ (AI Typing Indicator) */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-sm border bg-card px-4 py-2 text-xs text-muted-foreground shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:0.4s]" />
                    <span className="ml-1 text-[11px]">AI đang phân tích...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Gợi ý câu hỏi khi hội thoại mới */}
            {msgs.length <= 1 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Gợi ý chủ đề chuyên sâu:</span>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => {
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.label}
                        onClick={() => send(s.query)}
                        className="flex items-center gap-2 rounded-xl border border-border/80 bg-card p-2 text-left text-[11px] font-medium transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm"
                      >
                        <div className="rounded-lg bg-primary/10 p-1.5 text-primary shrink-0">
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="line-clamp-2 text-foreground/90">{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Vùng Nhập Tin Nhắn */}
          <div className="border-t bg-card/90 p-2.5 sm:p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Hỏi AI về SOP, CCP, CAPA, ISO 22000..."
                className="flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Gửi tin nhắn"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 active:scale-95 disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Nhấn <b>Enter</b> để gửi · AI hỗ trợ tra cứu tiêu chuẩn ISO 22000:2018
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function aiMock(q: string): string {
  const k = q.toLowerCase();
  if (k.includes("sop") || k.includes("dàn ý") || k.includes("nguyên liệu")) {
    return `📋 **DÀN Ý QUY TRÌNH SOP THEO ISO 22000:2018 (MỤC 7.5 & 8.2)**

1. **Mục đích:** Đảm bảo nguyên vật liệu đầu vào đáp ứng tiêu chuẩn an toàn thực phẩm, không tồn dư hóa chất/kháng sinh vượt ngưỡng.
2. **Phạm vi:** Toàn bộ nguyên liệu thô, phụ gia, bao bì tiếp xúc trực tiếp.
3. **Trách nhiệm:** Phòng Mua hàng, Bộ phận Tiếp nhận & Đội QC kiểm nghiệm.
4. **Quy trình thực hiện:**
   - Bước 1: Kiểm tra chứng thư COA và hồ sơ xuất xứ nhà cung cấp.
   - Bước 2: Kiểm tra cảm quan, hạn sử dụng, điều kiện xe vận chuyển.
   - Bước 3: Lấy mẫu test nhanh chỉ tiêu vi sinh / kháng sinh / dị nguyên.
   - Bước 4: Dán nhãn phân loại: "ĐẠT - XANH" hoặc "CHỜ KIỂM - VÀNG" hoặc "LOẠI BỎ - ĐỎ".
5. **Hồ sơ lưu trữ:** Biểu mẫu BM-IQC-01, Nhật ký lưu kho (tối thiểu 24 tháng).`;
  }

  if (k.includes("ccp") || k.includes("mối nguy") || k.includes("gia nhiệt") || k.includes("tiệt trùng")) {
    return `🛡️ **PHÂN TÍCH CCP CÔNG ĐOẠN GIA NHIỆT / THANH TRÙNG (ISO 22000 - ĐIỀU KHOẢN 8.5.4)**

• **Mối nguy xác định:** Vi sinh vật gây bệnh sống sót (Salmonella, Listeria monocytogenes, E. coli O157:H7).
• **Giới hạn tới hạn (Critical Limit - CL):**
  - Nhiệt độ tâm sản phẩm: ≥ 85.0°C.
  - Thời gian duy trì: ≥ 15 giây.
• **Quy trình giám sát:**
  - Thiết bị: Nhiệt kế tự ghi kết nối hệ thống SCADA + đo thủ công bằng que đo chuẩn mỗi 30 phút.
  - Người thực hiện: Vận hành viên máy thanh trùng và QC kiểm tra đối chiếu.
• **Hành động khắc phục (Corrective Action):**
  - Van hồi lưu tự động kích hoạt đẩy mẻ lỗi về bồn chứa sơ bộ.
  - Cô lập toàn bộ sản phẩm chế biến trong 15 phút gần nhất để xử lý lại.`;
  }

  if (k.includes("capa") || k.includes("khắc phục") || k.includes("lỗi") || k.includes("không phù hợp")) {
    return `⚙️ **QUY TRÌNH HÀNH ĐỘNG KHẮC PHỤC & PHÒNG NGỪA (CAPA - MỤC 8.9 & 10.2)**

1. **Khắc phục tức thời:** Cô lập lô sản phẩm không phù hợp, dán nhãn niêm phong, ngăn chặn phân phối ra thị trường.
2. **Phân tích nguyên nhân gốc rễ (Root Cause Analysis - 5 Why):**
   - *Tại sao nhiệt độ giảm?* Cảm biến bị bám cặn vôi.
   - *Tại sao bị bám cặn?* Lịch tẩy rửa CIP định kỳ bị bỏ qua trong ca trước.
3. **Hành động khắc phục lâu dài:**
   - Hiệu chuẩn lại đầu dò cảm biến nhiệt.
   - Cập nhật checklist kiểm tra CIP trước mỗi ca sản xuất.
4. **Thẩm tra hiệu lực sau 30 ngày:** Trưởng ban ATTP đánh giá lại tần suất sự cố tương tự.`;
  }

  if (k.includes("báo cáo") || k.includes("đánh giá nội bộ") || k.includes("checklist") || k.includes("9.2")) {
    return `📊 **CHECKLIST ĐÁNH GIÁ NỘI BỘ HỆ THỐNG FSMS (ISO 22000 - ĐIỀU KHOẢN 9.2)**

✅ **Điều khoản 4 & 5:** Bối cảnh tổ chức & Cam kết của Ban lãnh đạo về ATTP.
✅ **Điều khoản 6 & 7:** Quản lý rủi ro, nguồn lực con người, cơ sở hạ tầng và kiểm soát thông tin dạng văn bản (7.5).
✅ **Điều khoản 8 (Vận hành):**
  - Kiểm tra 8 chương trình PRP tiên quyết (vệ sinh, côn trùng, nước thải).
  - Đánh giá tính khả thi và hồ sơ kiểm soát CCP / oPRP.
  - Kiểm tra diễn tập thu hồi sản phẩm khẩn cấp (thời gian đạt < 4 giờ).
✅ **Điều khoản 9 & 10:** Đánh giá đo lường, họp xem xét lãnh đạo và cải tiến liên tục.`;
  }

  return `Tôi đã tiếp nhận câu hỏi của bạn: "${q}".
Theo chuẩn mực ISO 22000:2018 và nguyên tắc HACCP, bạn có thể tham khảo các tài liệu SOP liên quan hoặc click vào các chủ đề gợi ý (SOP, CCP, CAPA, Đánh giá nội bộ) để AI cung cấp bản thảo chi tiết!`;
}
