# Zapier Python Script Setup Guide

## Overview
This Python script processes webhook data from your app and extracts the necessary fields for your email template.

## How to Use in Zapier

### Step 1: Add Python Code Action
1. In your Zapier workflow, add a **Code by Zapier** action
2. Choose **Run Python** as the event
3. Select **Python 3** as the runtime

### Step 2: Configure Input Data
Map the following fields from your webhook trigger:
- `raw_output` - The nested JSON string containing the data
- `output` - Direct output field (fallback)
- `foodType` - Food type/category
- `friendMessage` - Friend's message
- `eventName` - Event name
- `restaurant` - Restaurant name
- `dateTime` - Date and time

### Step 3: Paste the Python Code
Copy the contents of `zapier_python_script_robust.py` and paste it into the Code field.

### Step 4: Configure Output
The script returns the following fields that you can use in your email template:
- `gemini_description` - Cleaned AI-generated description
- `food_type` - Food type/category
- `rating_score` - Extracted rating
- `friend_message` - Friend's message
- `event_name` - Event name
- `restaurant` - Restaurant name
- `date_time` - Date and time
- `comparison_metric` - Comparison metric used
- `max_words` - Maximum words for description
- `emails` - Array of email addresses
- `raw_output` - Raw output text (for debugging)

### Step 5: Use in Email Template
In your email template, reference these fields as:
```
{{=gives["344088429"]["gemini_description"]}}
{{=gives["344088429"]["food_type"]}}
{{=gives["344088429"]["rating_score"]}}
{{=gives["344088429"]["friend_message"]}}
{{=gives["344088429"]["event_name"]}}
{{=gives["344088429"]["restaurant"]}}
{{=gives["344088429"]["date_time"]}}
```

Note: Replace `344088429` with your actual Zapier step ID if different.

#### Example Email Template Usage
You can now use all fields in your email template:
- Event name: `{{=gives["344088429"]["event_name"]}}`
- Restaurant: `{{=gives["344088429"]["restaurant"]}}`
- Date/Time: `{{=gives["344088429"]["date_time"]}}`
- Food type: `{{=gives["344088429"]["food_type"]}}`
- Description: `{{=gives["344088429"]["gemini_description"]}}`
- Rating: `{{=gives["344088429"]["rating_score"]}}`
- Friend message: `{{=gives["344088429"]["friend_message"]}}`

## Script Features

### Error Handling
- Safely handles missing or malformed JSON
- Provides fallback values for all fields
- Handles edge cases like empty outputs

### Text Processing
- Removes markdown formatting (`**bold**`, `*italic*`)
- Cleans up whitespace
- Extracts ratings from various formats

### Rating Extraction
The script can extract ratings from formats like:
- "Rating: 4.5"
- "4.5/5"
- "4.5 out of 5"
- Embedded in text

## Testing

To test the script, you can use this sample input:
```json
{
  "raw_output": "{\"raw_body\":\"{\\\"output\\\":\\\"**Great restaurant for Italian food!**\\n\\nRating: 4.5/5\",\\\"foodType\\\":\\\"Italian\\\",\\\"friend_message\\\":\\\"Let's celebrate!\\\"}\"}",
  "output": "**Great restaurant for Italian food!**\n\nRating: 4.5/5",
  "foodType": "Italian",
  "friendMessage": "Let's celebrate!"
}
```

Expected output:
```json
{
  "gemini_description": "Great restaurant for Italian food!",
  "food_type": "Italian",
  "rating_score": "4.5/5",
  "friend_message": "Let's celebrate!",
  "event_name": "Celebration dinner",
  "restaurant": "The Golden Fork",
  "date_time": "2026-01-19-00",
  "comparison_metric": "overall best experience",
  "max_words": "25",
  "emails": ["user@example.com"],
  "raw_output": "**Great restaurant for Italian food!**\n\nRating: 4.5/5"
}
```

## Troubleshooting

### Issue: Fields are empty
- Check that `raw_output` is being passed correctly
- Verify the JSON structure matches what your app sends
- Check Zapier logs for parsing errors

### Issue: Rating not extracted
- The script tries multiple patterns to extract ratings
- If rating format is unusual, you may need to adjust the `extract_rating()` function

### Issue: Description is empty
- Falls back to "Join us for a great dining experience!" if no output
- Check that your AI comparison is generating output

## Alternative: Simple Version
If you prefer a simpler version without all the error handling, use `zapier_python_script.py` instead.
