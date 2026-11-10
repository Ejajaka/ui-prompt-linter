# Results

Generated automatically by `evaluate.py`.  Test sets were used for reporting only, never for tuning.

## Token-level entity F1 (seqeval, micro)

| split | bert | rules |
|---|---|---|
| dev | 1.000 | 0.993 |
| test | 0.900 | 0.971 |
| handwritten_test | 0.718 | 0.831 |

## Element detection (matched by token overlap)

| split | bert | rules |
|---|---|---|
| dev | 1.000 | 1.000 |
| test | 1.000 | 0.995 |
| handwritten_test | 1.000 | 0.986 |

## Missing-attribute detection (micro P/R/F1)

| split | backend | precision | recall | F1 |
|---|---|---|---|---|
| dev | bert | 1.000 | 1.000 | 1.000 |
| dev | rules | 1.000 | 1.000 | 1.000 |
| test | bert | 0.972 | 0.981 | 0.977 |
| test | rules | 0.979 | 0.993 | 0.986 |
| handwritten_test | bert | 0.880 | 0.978 | 0.926 |
| handwritten_test | rules | 0.957 | 0.978 | 0.967 |

## Prompt-level metrics

| split | backend | has_missing acc | exact missing set acc |
|---|---|---|---|
| dev | bert | 1.000 | 1.000 |
| dev | rules | 1.000 | 1.000 |
| test | bert | 0.970 | 0.910 |
| test | rules | 0.990 | 0.960 |
| handwritten_test | bert | 0.933 | 0.800 |
| handwritten_test | rules | 0.967 | 0.900 |

## Attribute linking accuracy (gold tags)

| split | backend | accuracy | correct/total |
|---|---|---|---|
| dev | bert | 1.000 | 447/447 |
| dev | rules | 1.000 | 447/447 |
| test | bert | 1.000 | 627/627 |
| test | rules | 1.000 | 627/627 |
| handwritten_test | bert | 1.000 | 63/63 |
| handwritten_test | rules | 1.000 | 63/63 |

## Per-label entity F1

| split | backend | ELEMENT | COLOR | LOCATION | ACTION | LABEL |
|---|---|---|---|---|---|---|
| dev | bert | 1.000 | 1.000 | 1.000 | 1.000 | 1.000 |
| dev | rules | 1.000 | 1.000 | 1.000 | 0.951 | 0.983 |
| test | bert | 0.915 | 0.837 | 0.939 | 0.871 | 0.901 |
| test | rules | 0.995 | 1.000 | 0.951 | 0.883 | 0.957 |
| handwritten_test | bert | 0.831 | 1.000 | 0.129 | 0.842 | 0.706 |
| handwritten_test | rules | 0.986 | 1.000 | 0.129 | 0.889 | 0.936 |

## Missing detection by attribute (F1)

| split | backend | COLOR | LOCATION | ACTION | LABEL |
|---|---|---|---|---|---|
| dev | bert | 1.000 | 1.000 | 1.000 | 1.000 |
| dev | rules | 1.000 | 1.000 | 1.000 | 1.000 |
| test | bert | 0.948 | 0.996 | 0.971 | 0.979 |
| test | rules | 1.000 | 0.986 | 1.000 | 0.973 |
| handwritten_test | bert | 1.000 | 1.000 | 1.000 | 0.741 |
| handwritten_test | rules | 0.957 | 1.000 | 1.000 | 0.917 |

## Synthetic vs handwritten gap

| backend | split | source | prompts | entity F1 | missing F1 | exact set acc |
|---|---|---|---|---|---|---|
| bert | dev | synthetic | 150 | 1.000 | 1.000 | 1.000 |
| bert | test | synthetic | 200 | 0.900 | 0.977 | 0.910 |
| bert | handwritten_test | handwritten | 30 | 0.718 | 0.926 | 0.800 |
| rules | dev | synthetic | 150 | 0.993 | 1.000 | 1.000 |
| rules | test | synthetic | 200 | 0.971 | 0.986 | 0.960 |
| rules | handwritten_test | handwritten | 30 | 0.831 | 0.967 | 0.900 |

The synthetic-vs-handwritten gap is expected: the synthetic templates share vocabulary with training, while the handwritten prompts use freer phrasing and different span boundaries (for example they often exclude 'at the' from a location).

## Representative errors

### bert

- **missed missing** (test-0015): Make an admin panel for a library system. Give me a dark blue CTA button that sends a confirmation email above the footer. Additionally, insert a dropdown menu to choose payment method, that switches the theme.  
  gold missing: `[[1, 'LABEL'], [2, 'LOCATION']]`; predicted: `[[2, 'LOCATION']]`
- **false missing** (test-0037): Design a #2E86C1 button saying "Download", at the top left that takes the user to the checkout page.  
  gold missing: `[]`; predicted: `[[1, 'COLOR']]`
- **false missing** (test-0051): Include a white CTA button with the text "Buy Now", which submits the form in the top right corner. Next, put a modal window in #2E86C1 colour with the title "Subscribe to Newsletter".  
  gold missing: `[[2, 'ACTION']]`; predicted: `[[2, 'ACTION'], [2, 'COLOR']]`
- **missed missing** (test-0060): Design a tick box in the middle of the screen. Additionally, insert a call-to-action button with the usual content somewhere on the side. Also add a banner image.  
  gold missing: `[[1, 'LABEL'], [2, 'ACTION'], [2, 'COLOR'], [2, 'LABEL'], [2, 'LOCATION'], [3, 'LABEL'], [3, 'LOCATION']]`; predicted: `[[1, 'LABEL'], [2, 'ACTION'], [2, 'COLOR'], [2, 'LOCATION'], [3, 'LABEL'], [3, 'LOCATION']]`
- **false missing** (test-0082): Include a content card named "Latest News", in #2E86C1 colour beside the search bar. Also add a select box listing currency which sorts products by price at the center of the page. Also include a side panel in a bright colour.  
  gold missing: `[[3, 'COLOR'], [3, 'LABEL'], [3, 'LOCATION']]`; predicted: `[[1, 'COLOR'], [3, 'COLOR'], [3, 'LABEL'], [3, 'LOCATION']]`
- **mixed** (test-0096): I want a maroon primary button that works properly, under the hero image with some text. Next, put a modal called "Login", that opens when the user clicks the profile icon. Also include a footer section.  
  gold missing: `[[1, 'ACTION'], [1, 'LABEL'], [2, 'COLOR'], [3, 'COLOR'], [3, 'LABEL']]`; predicted: `[[1, 'LABEL'], [1, 'LOCATION'], [2, 'COLOR'], [3, 'COLOR'], [3, 'LABEL']]`
- **false missing** (test-0100): Put a dark blue page footer showing company address and phone number. Next, put a menu bar with the items Home, Services, Gallery at the top of the page coloured #FF5733.  
  gold missing: `[]`; predicted: `[[2, 'COLOR']]`
- **mixed** (test-0102): Build a landing page for a coffee shop. I need a picture at the center of the page. Also add a #2E86C1 card above the footer.  
  gold missing: `[[1, 'LABEL'], [2, 'LABEL']]`; predicted: `[[1, 'LABEL'], [2, 'COLOR']]`
- **false missing** (test-0105): Give me a modal titled "Session Expired" coloured #2E86C1 that appears when the user clicks Delete.  
  gold missing: `[]`; predicted: `[[1, 'COLOR']]`
- **missed missing** (test-0113): Create a call-to-action button in the top right corner. Also include a text box asking for username, somewhere on the page.  
  gold missing: `[[1, 'ACTION'], [1, 'COLOR'], [1, 'LABEL'], [2, 'LOCATION']]`; predicted: `[[1, 'ACTION'], [1, 'COLOR'], [2, 'LOCATION']]`

### rules

- **element boundary/count** (test-0003): Create a portfolio website. Give me a banner image of the product photo. Next, put a call-to-action button that opens the signup form with the text "Login", above the footer, coloured navy blue.  
  gold missing: `[[1, 'LOCATION']]`; predicted: `[[1, 'LABEL'], [1, 'LOCATION']]`
- **missed missing** (test-0030): Include a picture. Additionally, insert a footer section in a bright colour with suitable content. Also include a card in the middle of the screen.  
  gold missing: `[[1, 'LABEL'], [1, 'LOCATION'], [2, 'COLOR'], [2, 'LABEL'], [3, 'COLOR'], [3, 'LABEL']]`; predicted: `[[1, 'LABEL'], [1, 'LOCATION'], [2, 'COLOR'], [3, 'COLOR'], [3, 'LABEL']]`
- **element boundary/count** (test-0044): Put a dropdown menu listing sort order which shows the matching results in the top right corner. Also add a photo depicting a team photo in the middle of the screen.  
  gold missing: `[]`; predicted: `[[2, 'LABEL'], [2, 'LOCATION']]`
- **missed missing** (test-0125): Put a sidebar with the usual content. Then add a menu bar in the top right corner.  
  gold missing: `[[1, 'COLOR'], [1, 'LABEL'], [1, 'LOCATION'], [2, 'COLOR'], [2, 'LABEL']]`; predicted: `[[1, 'COLOR'], [1, 'LOCATION'], [2, 'COLOR'], [2, 'LABEL']]`
- **element boundary/count** (test-0131): Add a CTA button with suitable content that saves the changes. Next, put a picture of a team photo.  
  gold missing: `[[1, 'COLOR'], [1, 'LABEL'], [1, 'LOCATION'], [2, 'LOCATION']]`; predicted: `[[1, 'COLOR'], [1, 'LABEL'], [1, 'LOCATION'], [2, 'LABEL'], [2, 'LOCATION']]`
- **element boundary/count** (test-0134): Build the homepage of a travel blog. Add an image of the product photo, in the middle of the screen. Then add a check box below the header, with the text "Subscribe to updates". Next, put a yellow card titled "Our Team".  
  gold missing: `[[3, 'LOCATION']]`; predicted: `[[1, 'LABEL'], [1, 'LOCATION'], [3, 'LOCATION']]`
- **missed missing** (test-0181): Design a #FF5733 page footer with the usual content.  
  gold missing: `[[1, 'LABEL']]`; predicted: `[]`
- **false missing** (test-0187): Make a checkout screen for an online store. I need a navigation bar with the items Features, Pricing, FAQ on the right side. Then place a dropdown menu which updates the displayed currency somewhere visible to choose sort order.  
  gold missing: `[[1, 'COLOR'], [2, 'LOCATION']]`; predicted: `[[1, 'COLOR'], [2, 'LABEL'], [2, 'LOCATION']]`
- **false missing** (hand-017): Make the Submit button orange.  
  gold missing: `[[1, 'ACTION'], [1, 'LOCATION']]`; predicted: `[[1, 'ACTION'], [1, 'LABEL'], [1, 'LOCATION']]`
- **element boundary/count** (hand-018): Add a teal card titled "Our Team" in the middle of the screen, and below it a footer with contact details.  
  gold missing: `[[2, 'COLOR']]`; predicted: `[]`

Per-attribute and per-element-type tables are stored in the JSON metrics files (`results/metrics_*.json`).
