import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

const faqs = [
  {
    question: "What is Solar?",
    answer:
      "Solar is a DePIN-powered financing platform that tokenizes real-world renewable energy assets, starting with solar, to bridge the global financing gap.",
  },
  {
    question: "How does solar asset tokenization work?",
    answer:
      "We convert the ownership and revenue rights of solar projects into digital tokens on the Stellar blockchain, allowing for fractional investment and automated yield distribution.",
  },
  {
    question: "What are the benefits for investors?",
    answer:
      "Investors gain access to stable, ESG-friendly yields with lower entry barriers through fractional ownership and 100% transparency via blockchain records.",
  },
  {
    question: "How can solar installers get financing?",
    answer:
      "Installers can submit their projects through our platform. After a rigorous off-chain evaluation, approved projects are tokenized and funded by our global investor network.",
  },
  {
    question: "Why use the Stellar blockchain?",
    answer:
      "Stellar is built for real-world finance. It offers near-zero fees, high throughput, and a mature ecosystem for regulated assets, making it perfect for transparent energy financing.",
  },
  {
    question: "How is the yield distributed?",
    answer:
      "Yield is automatically distributed to token holders' wallets in stablecoins (like USDC) based on actual energy production data tracked on-chain.",
  },
]

export function FAQSection() {
  return (
    <section id="faq" className="py-32 px-6 pb-80">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-normal mb-6 text-balance font-sans">Frequently Asked Questions</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything you need to know about Solar. Have a question not listed? Reach out to our team.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3 py-0 my-0">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-foreground/30"
            >
              <AccordionTrigger className="text-left text-base font-medium text-foreground hover:no-underline py-5">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-5 leading-relaxed text-sm">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  )
}
