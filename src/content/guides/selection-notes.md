---
title: "How to read a model code before you order"
tldr: "A model code carries range, output and connection in order. Reading it left to right avoids most ordering mistakes."
updated: 2026-09-15
draft: false
relatedModels: ["a1","a2"]
relatedApplications: ["constant-duty"]
seoTitle: "How to read a model code before you order — field"
seoDescription: "How to read a model code before you order: how the code is structured, which segment decides fit, and the ordering mistakes it prevents. Notes."
---

Every code on this site is built the same way, so once you can read one you can read all of them.

## Range comes first
The first segment is the measuring range. A code ending in a small number is not a cheaper version of the large one — it is a different span with its own accuracy class.

## Output follows
The middle segment describes the output signal. Two models with the same range but different output are not interchangeable at the PLC level, even though they mount the same way.

## Connection last
The final segment covers the process connection and IP rating. This is where most field surprises come from: same thread, different seal material.

## In practice
Check range against the duty point, confirm the output matches the control input, then verify the connection against the drawing.
