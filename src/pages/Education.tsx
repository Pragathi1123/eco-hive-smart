import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Recycle, Leaf, Battery, Droplet, Trees, Zap } from "lucide-react";

const Education = () => {
  const categories = [
    {
      icon: <Recycle className="h-5 w-5" />,
      title: "Plastic Recycling",
      color: "text-blue-500",
      topics: [
        {
          question: "What types of plastic can be recycled?",
          answer: "Most rigid plastics with recycling symbols #1 (PET), #2 (HDPE), and #5 (PP) can be recycled. This includes water bottles, milk jugs, and food containers. Always check local guidelines as recycling capabilities vary by location."
        },
        {
          question: "How should I prepare plastic for recycling?",
          answer: "Rinse containers to remove food residue, remove caps and lids (recycle separately if accepted), flatten bottles to save space, and never bag recyclables in plastic bags. Clean, dry plastic recycles better."
        }
      ]
    },
    {
      icon: <Leaf className="h-5 w-5" />,
      title: "Organic Waste",
      color: "text-green-500",
      topics: [
        {
          question: "What is composting?",
          answer: "Composting is the natural process of decomposing organic waste into nutrient-rich soil. It includes fruit and vegetable scraps, coffee grounds, eggshells, and yard waste. Avoid meat, dairy, and oils."
        },
        {
          question: "Benefits of composting",
          answer: "Composting reduces landfill waste by up to 30%, creates free fertilizer for plants, reduces methane emissions, improves soil health, and helps retain moisture in soil."
        }
      ]
    },
    {
      icon: <Trees className="h-5 w-5" />,
      title: "Paper & Cardboard",
      color: "text-amber-500",
      topics: [
        {
          question: "What paper products are recyclable?",
          answer: "Office paper, newspapers, magazines, cardboard boxes, and paperboard (cereal boxes) are recyclable. Pizza boxes with grease stains, waxed paper, and shredded paper may not be accepted."
        },
        {
          question: "Environmental impact",
          answer: "Recycling one ton of paper saves 17 trees, 7,000 gallons of water, 380 gallons of oil, and 3 cubic yards of landfill space. It also reduces greenhouse gas emissions."
        }
      ]
    },
    {
      icon: <Battery className="h-5 w-5" />,
      title: "E-Waste",
      color: "text-purple-500",
      topics: [
        {
          question: "What is e-waste?",
          answer: "E-waste includes discarded electronic devices like phones, computers, batteries, appliances, and cables. These contain valuable materials and hazardous substances that require special handling."
        },
        {
          question: "Proper e-waste disposal",
          answer: "Never throw electronics in regular trash. Use certified e-waste collection centers, manufacturer take-back programs, or retailer recycling events. Many components can be refurbished or recycled."
        }
      ]
    },
    {
      icon: <Droplet className="h-5 w-5" />,
      title: "Hazardous Waste",
      color: "text-red-500",
      topics: [
        {
          question: "What qualifies as hazardous waste?",
          answer: "Batteries, paint, chemicals, pesticides, motor oil, fluorescent bulbs, and cleaning products. These can harm the environment and human health if not disposed of properly."
        },
        {
          question: "Safe disposal methods",
          answer: "Use designated hazardous waste collection facilities or special collection events. Never pour chemicals down drains or throw them in regular trash. Store safely until proper disposal is available."
        }
      ]
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "Waste Reduction Tips",
      color: "text-yellow-500",
      topics: [
        {
          question: "The 5 R's of waste management",
          answer: "1. Refuse - Say no to single-use items. 2. Reduce - Buy only what you need. 3. Reuse - Choose reusable over disposable. 4. Repurpose - Find new uses for old items. 5. Recycle - Properly sort recyclables."
        },
        {
          question: "Zero waste lifestyle tips",
          answer: "Use reusable bags, bottles, and containers. Buy in bulk to reduce packaging. Choose products with minimal packaging. Repair instead of replace. Donate unwanted items. Compost organic waste."
        }
      ]
    }
  ];

  const quickStats = [
    { label: "CO₂ Saved", value: "1.2 tons", desc: "by recycling 1 ton of plastic" },
    { label: "Energy Saved", value: "95%", desc: "by recycling aluminum" },
    { label: "Water Saved", value: "7,000 gal", desc: "by recycling 1 ton of paper" },
    { label: "Landfill Space", value: "30%", desc: "can be reduced by composting" }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Learn About Waste Management</h1>
          <p className="text-muted-foreground mt-2">
            Educational resources to help you reduce, reuse, and recycle effectively
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickStats.map((stat, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardDescription className="text-xs">{stat.label}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          {categories.map((category, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={category.color}>{category.icon}</div>
                  {category.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {category.topics.map((topic, topicIndex) => (
                    <AccordionItem key={topicIndex} value={`item-${topicIndex}`}>
                      <AccordionTrigger className="text-left">
                        {topic.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {topic.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-gradient-primary">
          <CardHeader>
            <CardTitle className="text-primary-foreground">Your Impact Matters</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Every small action contributes to a healthier planet
            </CardDescription>
          </CardHeader>
          <CardContent className="text-primary-foreground/90">
            <p className="text-sm leading-relaxed">
              By properly sorting and recycling your waste, you're helping conserve natural resources,
              reduce pollution, and combat climate change. Continue tracking your waste to see your
              positive environmental impact grow over time!
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Education;
