import json
import re

# Zapier provides data as inputData dictionary
# Access fields using inputData['keyName']
input_data = inputData if 'inputData' in locals() else {}

def safe_json_parse(json_str, default=None):
    """Safely parse JSON string."""
    if not json_str or not isinstance(json_str, str):
        return default or {}
    try:
        return json.loads(json_str)
    except (json.JSONDecodeError, TypeError):
        return default or {}

def extract_rating(text):
    """Extract rating from text. Returns a number/decimal as string."""
    if not text:
        return ""
    
    # Pattern 1: "Rating: 4.5" or "Rating 4.5"
    rating_match = re.search(r'rating[:\s]+([0-9.]+)', text.lower())
    if rating_match:
        rating_value = rating_match.group(1).strip()
        # Validate it's a reasonable rating (0-5)
        try:
            rating_float = float(rating_value)
            if 0 <= rating_float <= 5:
                return str(rating_float)
        except:
            pass
    
    # Pattern 2: "4.5/5" or "4.5 out of 5" - extract just the number
    score_match = re.search(r'([0-9.]+)\s*(?:/|out of)\s*5', text.lower())
    if score_match:
        rating_value = score_match.group(1).strip()
        try:
            rating_float = float(rating_value)
            if 0 <= rating_float <= 5:
                return str(rating_float)
        except:
            pass
    
    # Pattern 3: Just a decimal number between 0 and 5 (standalone)
    standalone_match = re.search(r'\b([0-4](?:\.[0-9]+)?|5(?:\.0+)?)\b', text)
    if standalone_match:
        rating_value = standalone_match.group(1)
        try:
            rating_float = float(rating_value)
            if 0 <= rating_float <= 5:
                return str(rating_float)
        except:
            pass
    
    return ""

def clean_text(text):
    """Remove markdown formatting."""
    if not text:
        return ""
    text = text.replace('**', '').replace('*', '')
    text = ' '.join(text.split())
    return text.strip()

# Extract fields directly from Zapier (capitalized field names)
restaurant = str(input_data.get('Restaurant', '') or '')
restaurant_rating = str(input_data.get('Restaurant Rating', '') or input_data.get('restaurantRating', '') or '')
event_name = str(input_data.get('Event Name', '') or '')
date_time = str(input_data.get('Date Time', '') or '')
friend_message = str(input_data.get('Friend Message', '') or '')
output_text = str(input_data.get('Output', '') or '')
food_type = str(input_data.get('Food Type', '') or '')
comparison_metric = str(input_data.get('Comparison Metric', '') or '')
max_words = str(input_data.get('Max Words', '') or '')
emails = input_data.get('Emails', []) or []

# Also try to get from nested raw_output structure (fallback)
raw_output_str = input_data.get('raw_output', '{}')
if raw_output_str:
    try:
        outer_data = json.loads(raw_output_str)
        raw_body_str = outer_data.get('raw_body', '{}')
        if raw_body_str:
            inner_data = json.loads(raw_body_str)
            # Use nested data if direct fields are empty
            if not output_text and inner_data.get('output'):
                output_text = str(inner_data.get('output', ''))
            if not food_type and inner_data.get('foodType'):
                food_type = str(inner_data.get('foodType', ''))
            if not friend_message and inner_data.get('friend_message'):
                friend_message = str(inner_data.get('friend_message', ''))
    except:
        pass

# Process the output text to extract description and rating
gemini_description = ""
rating_score = ""

if output_text:
    # Split by double newlines
    parts = [p.strip() for p in output_text.split('\n\n') if p.strip()]
    
    if len(parts) > 0:
        gemini_description = clean_text(parts[0])
    
    # Look for rating in all parts
    for part in parts:
        extracted_rating = extract_rating(part)
        if extracted_rating:
            rating_score = extracted_rating
            break
    
    # If no rating found in parts, search the full text
    if not rating_score:
        rating_score = extract_rating(output_text)
    
    if not gemini_description:
        gemini_description = clean_text(output_text)
else:
    gemini_description = "Join us for a great dining experience!"

# If still no rating from output text, use restaurant rating if available
if not rating_score and restaurant_rating:
    rating_score = restaurant_rating

# Ensure food_type has a default
if not food_type:
    food_type = "Local Cuisine"

# Return all fields for Zapier email template
# rating_score is a number/decimal as string (e.g., "4.5" or "")
return {
    'gemini_description': gemini_description,
    'food_type': food_type,
    'rating_score': rating_score,  # Number/decimal as string (e.g., "4.5")
    'rating': rating_score,  # Also provide as 'rating' for convenience
    'friend_message': friend_message,
    'event_name': event_name,
    'restaurant': restaurant,
    'date_time': date_time,
    'comparison_metric': comparison_metric,
    'max_words': max_words,
    'emails': emails,
    'raw_output': output_text,
}
