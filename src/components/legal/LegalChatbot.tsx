"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Scale, Send, MessageCircle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface Message {
  id: string
  text: string
  sender: "user" | "lawyer"
  timestamp: Date
}

const legalKnowledge: Record<string, string> = {
  "fir": `FIR (First Information Report) - Complete Guide

What is an FIR?
An FIR is the first report of a crime that is registered at a police station. It is your right to file an FIR for any cognizable offense.

📝 How to File an FIR:
1. Visit the nearest police station
2. Describe your problem in detail
3. Provide all important details (date, time, location)
4. Give names and addresses of witnesses
5. Always get a copy of the FIR

⏰ When to File:
- Immediately after the crime occurs
- Within 24 hours is ideal
- Can be filed later, but you must provide a reason for the delay

⚖️ Legal Points:
- Filing an FIR is your right
- Police cannot refuse to register an FIR
- If police refuse, file a complaint with the SP (Superintendent of Police)
- Keep your FIR copy safe for future reference
- You can file an FIR at any police station, not necessarily where the crime occurred`,

  "consumer": `Consumer Court Complaint - Step by Step Guide

🛒 What is Consumer Court?
Consumer Court is a special court for consumer rights when you receive defective products or poor services.

📋 How to File a Complaint:
1. Visit the Consumer Forum website or office
2. Fill out the online form or get a paper form
3. Include all documents (bills, warranty, photos)
4. Pay the fee (₹200-500 depending on the claim amount)
5. Decision usually comes within 3-6 months

💰 Compensation:
- Refund of defective product price
- Additional compensation may be awarded
- Compensation for mental harassment
- Replacement of product or service

⚖️ Legal Points:
- Up to ₹20 lakh: District Forum
- ₹20 lakh - ₹1 crore: State Commission
- Above ₹1 crore: National Commission
- No lawyer required for small claims
- Simple and affordable process`,

  "property": `Property Disputes - What to Do

🏠 Property Disputes Guide:
1. Collect all documents (deed, registration, survey)
2. Consult with a lawyer
3. File a case in Civil Court
4. Gather evidence (photos, witnesses, previous owners)

⚠️ Precautions:
- Don't let anyone encroach on your property
- Keep all documents safe
- Always seek legal advice
- Take immediate action in case of encroachment
- Verify property documents before purchase

⚖️ Legal Points:
- Property Registration is mandatory
- Register your Will as well
- Keep mutation records updated
- Maintain property tax receipts
- Get property surveyed regularly`,

  "fraud": `Fraud Protection - How to Stay Safe

🚨 Warning Signs of Fraud:
- Promises of very high returns
- Asking for immediate payment
- Refusing to show documents
- Creating pressure
- Asking for OTP or passwords

🛡️ Protection Methods:
1. Never share OTP with anyone
2. Don't click on unknown links
3. Research before making large payments
4. Report to police immediately
5. Inform your bank immediately

📞 Helplines: 
- Cyber Crime: 1930
- Police Emergency: 100
- Bank Fraud: Contact your bank immediately
- National Cyber Crime Portal: cybercrime.gov.in

⚖️ Legal Points:
- File FIR immediately
- Keep bank statements safe
- Collect all evidence
- Report to cyber crime cell
- Freeze bank accounts if needed`,

  "legal aid": `Free Legal Aid - Where to Get Help

⚖️ Free Legal Assistance:
1. District Legal Services Authority (DLSA)
2. State Legal Services Authority (SLSA)
3. National Legal Services Authority (NALSA)
4. Legal Aid Clinics at Law Colleges
5. NGOs providing legal aid

📋 Eligibility Criteria:
- Low-income individuals
- Women, children, senior citizens
- SC/ST community members
- Persons with disabilities
- Industrial workers
- Victims of human trafficking

🌐 Website: nalsa.gov.in
📞 Helpline: Contact your district's DLSA office

⚖️ Legal Points:
- Legal Aid is your right
- Free lawyer can be provided
- Court fees may be waived
- Available for civil and criminal cases
- No discrimination based on religion, caste, or gender`,

  "lawyer fees": `Lawyer Fees Estimate - Area-wise Guide

💰 General Fee Structure:
- Consultation: ₹500-2,000
- Simple Cases: ₹10,000-50,000
- Complex Cases: ₹50,000-2,00,000+
- Supreme Court Cases: ₹1,00,000+

🏙️ City-wise Estimates:
- Tier 1 Cities (Mumbai, Delhi): ₹15,000-3,00,000
- Tier 2 Cities (Pune, Bangalore): ₹10,000-1,50,000
- Tier 3 Cities (Smaller cities): ₹5,000-50,000

💡 Tips:
- Ask about consultation fee first
- Get a written agreement
- Pay minimal advance
- Clarify fee structure upfront
- Negotiate if possible

⚖️ Legal Points:
- Check Bar Council rates
- Free legal aid is also available
- Get fee agreement in writing
- Understand payment terms
- Ask about additional charges`
}

const quickQuestions = [
  "How to file an FIR?",
  "How to file a Consumer Court complaint?",
  "What to do in property disputes?",
  "How to protect from fraud?",
  "Where to get free legal aid?",
  "What are typical lawyer fees?"
]

export function LegalChatbot() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your legal advisor. I can help you with legal information and guide you through legal procedures. What would you like to know?",
      sender: "lawyer",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const findAnswer = async (question: string): Promise<string> => {
    try {
      // Call the API to search in vector database
      const response = await fetch('/api/legal/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: question }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Search failed')
      }

      const data = await response.json()
      
      // Format answer with sources if available
      let answer = data.answer || "I couldn't find relevant information. Please try rephrasing your question."
      
      if (data.sources && data.sources.length > 0) {
        interface Source {
          title: string;
          file: string;
        }
        answer += `\n\n📚 Sources:\n${(data.sources as Source[]).map((source, idx: number) => `${idx + 1}. ${source.title} (${source.file})`).join('\n')}`
        
        // Show success toast with sources
        toast({
          title: "Answer Found",
          description: `Found ${data.sources.length} relevant document${data.sources.length > 1 ? 's' : ''}`,
          variant: "default",
        })
      } else {
        // Show info toast when no sources
        toast({
          title: "Using General Knowledge",
          description: "Answering from general legal knowledge base",
          variant: "default",
        })
      }
      
      return answer
    } catch (error) {
      console.error('Error searching legal documents:', error)
      
      // Show error toast
      toast({
        title: "Search Error",
        description: error instanceof Error ? error.message : "Unable to search legal documents. Using fallback knowledge.",
        variant: "destructive",
      })
      
      // Fallback to hardcoded knowledge if API fails
      const lowerQuestion = question.toLowerCase()
      
      if (lowerQuestion.includes("fir") || lowerQuestion.includes("police") || lowerQuestion.includes("report") || lowerQuestion.includes("crime")) {
        return legalKnowledge.fir
      } else if (lowerQuestion.includes("consumer") || lowerQuestion.includes("complaint") || lowerQuestion.includes("defective")) {
        return legalKnowledge.consumer
      } else if (lowerQuestion.includes("property") || lowerQuestion.includes("land") || lowerQuestion.includes("dispute")) {
        return legalKnowledge.property
      } else if (lowerQuestion.includes("fraud") || lowerQuestion.includes("scam") || lowerQuestion.includes("cyber")) {
        return legalKnowledge.fraud
      } else if (lowerQuestion.includes("legal aid") || lowerQuestion.includes("free") || lowerQuestion.includes("assistance")) {
        return legalKnowledge["legal aid"]
      } else if (lowerQuestion.includes("lawyer") || lowerQuestion.includes("fees") || lowerQuestion.includes("cost") || lowerQuestion.includes("attorney")) {
        return legalKnowledge["lawyer fees"]
      } else {
        return "I'm trying to understand your question. Please rephrase it or select one of the quick questions below. I can help you with:\n\n• FIR filing\n• Consumer Court complaints\n• Property disputes\n• Fraud protection\n• Free legal aid\n• Lawyer fees"
      }
    }
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: "user",
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput("")
    setIsTyping(true)

    // Get answer from API
    try {
      const answer = await findAnswer(currentInput)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: answer,
        sender: "lawyer",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMessage])
      setIsTyping(false)
    } catch (error) {
      console.error('Error getting answer:', error)
      
      // Show error toast
      toast({
        title: "Error",
        description: "Failed to get answer. Please try again.",
        variant: "destructive",
      })
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "I apologize, but I encountered an error. Please try again.",
        sender: "lawyer",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
      setIsTyping(false)
    }
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    setTimeout(() => {
      handleSend()
    }, 100)
  }

  return (
    <>
      {/* Floating Chat Button with Animation */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "h-16 w-16 rounded-full",
          "bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700",
          "shadow-2xl shadow-indigo-500/50",
          "flex items-center justify-center",
          "text-white",
          "hover:scale-110 active:scale-95",
          "transition-all duration-300",
          "animate-bounce hover:animate-none",
          "ring-4 ring-indigo-300/50",
          "group"
        )}
        aria-label="Open Legal Chatbot"
      >
        <Scale className="h-8 w-8 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-2 -right-2 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold animate-pulse">
          !
        </span>
      </button>

      {/* Chat Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-800 text-white rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <Scale className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  Legal Rights Assistant
                  <Sparkles className="h-4 w-4" />
                </DialogTitle>
                <DialogDescription className="text-indigo-100">
                  Your Legal Advisor - Available 24/7
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 py-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3 animate-in fade-in slide-in-from-bottom-2",
                    message.sender === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.sender === "lawyer" && (
                    <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2 shadow-sm",
                      message.sender === "user"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                    )}
                  >
                    <p className="text-sm whitespace-pre-line leading-relaxed">
                      {message.text}
                    </p>
                    <span className="text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                  </div>
                  {message.sender === "user" && (
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {isTyping && (
                <div className="flex gap-3 justify-start animate-in fade-in">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <Scale className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-lg px-4 py-2 border border-slate-200 dark:border-slate-700">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="px-4 py-2 border-t bg-slate-50 dark:bg-slate-900">
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-medium">Quick Questions:</p>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickQuestion(q)}
                    className="text-xs px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="px-4 pb-4 pt-2 border-t">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask your legal question..."
                className="flex-1"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
