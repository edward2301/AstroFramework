---
question: "What happens if the output signal does not match the PLC input?"
cluster: params
relatedModels: ["b1"]
relatedFaqs: []
seoTitle: "Output signal does not match the PLC input?"
seoDescription: "A mismatched signal still measures correctly, but the controller reads full scale or a constant and looks like a sensor fault. Check the input card first."
draft: false
---

The unit will still measure correctly, but the controller reads a wrong value — usually full scale or a constant, which is easily mistaken for a sensor fault.

Check the input card configuration before replacing hardware: many cards accept two or three signal types and only need a jumper or parameter change.
