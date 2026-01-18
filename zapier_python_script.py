import json

# Get the input data from Zapier
input_data = input_data if 'input_data' in locals() else {}

# 1. Get the raw text from your Zapier mapping
raw_input = input_data.get('raw_output', '{}')

# 2. Parse the outer layer
try:
    outer_data = json.loads(raw_input)
except (json.JSONDecodeError, TypeError):
    outer_data = {}

# 3. Parse the nested 'raw_body' string into a dictionary
# This is the step that was missing!
raw_body_str = outer_data.get('raw_body', '{}')
try:
    inner_data = json.loads(raw_body_str)
except (json.JSONDecodeError, TypeError):
    inner_data = {}

# 4. Now we can grab the actual keys
# Fallback to direct fields if nested parsing fails
full_output = inner_data.get('output', '') or input_data.get('output', '')
food_type = inner_data.get('foodType', '') or input_data.get('foodType', 'N/A')

# Handle friend_message with explicit None handling
friend_message_inner = inner_data.get('friend_message')
friend_message_direct = input_data.get('friendMessage')
friend_message = (
    ('' if friend_message_inner is None else friend_message_inner) or 
    ('' if friend_message_direct is None else friend_message_direct) or 
    ''
)

# 5. Clean the "output" text (remove stars and split rating)
gemini_description = ""
rating_score = ""

if full_output:
    # Split by double newlines
    parts = full_output.split('\n\n')
    
    # First part is the description
    if len(parts) > 0:
        gemini_description = parts[0].replace('**', '').strip()
    
    # Second part might contain rating
    if len(parts) > 1:
        # Removes stars and the "Rating: " prefix
        rating_text = parts[1].replace('**', '').replace('Rating: ', '').strip()
        rating_score = rating_text
    elif len(parts) > 0:
        # If no second part, check if rating is in the first part
        if 'rating' in full_output.lower():
            # Try to extract rating from the text
            import re
            rating_match = re.search(r'rating[:\s]+([0-9.]+|[\w\s]+)', full_output.lower())
            if rating_match:
                rating_score = rating_match.group(1).strip()
    
    # If still no rating, set default
    if not rating_score:
        rating_score = "Not specified"
else:
    gemini_description = "No description available"
    rating_score = "Not specified"

# 6. Extract additional fields from input_data
# Handle None/null values explicitly
def safe_get(data, key, default=''):
    """Safely get value from dict, converting None to empty string."""
    value = data.get(key, default)
    # Handle both None and empty string cases
    if value is None:
        return default
    # Convert to string if it's not already, but preserve non-empty values
    if value == '':
        return default
    return str(value) if value else default

# Try multiple possible key names (Zapier sometimes changes case or adds prefixes)
event_name = (
    safe_get(input_data, 'eventName', '') or 
    safe_get(input_data, 'event_name', '') or
    safe_get(input_data, 'EventName', '') or
    ''
)

restaurant = (
    safe_get(input_data, 'restaurant', '') or 
    safe_get(input_data, 'Restaurant', '') or
    ''
)

date_time = (
    safe_get(input_data, 'dateTime', '') or 
    safe_get(input_data, 'date_time', '') or
    safe_get(input_data, 'DateTime', '') or
    ''
)

friend_message_direct = (
    safe_get(input_data, 'friendMessage', '') or 
    safe_get(input_data, 'friend_message', '') or
    safe_get(input_data, 'FriendMessage', '') or
    ''
)

# Use friend_message_direct if we got it from direct fields, otherwise use the nested one
if not friend_message and friend_message_direct:
    friend_message = friend_message_direct

comparison_metric = safe_get(input_data, 'comparisonMetric', '') or safe_get(input_data, 'comparison_metric', '')
max_words = safe_get(input_data, 'maxWords', '') or safe_get(input_data, 'max_words', '')
emails = input_data.get('emails', []) or input_data.get('Emails', []) or []

# 7. Return the clean data pills for Zapier
# These will be available as gives["344088429"]["field_name"] in your email template
return {
    'gemini_description': gemini_description,
    'food_type': food_type,
    'rating_score': rating_score,
    'friend_message': friend_message,
    # Additional fields from webhook
    'event_name': event_name,
    'restaurant': restaurant,
    'date_time': date_time,
    'comparison_metric': comparison_metric,
    'max_words': max_words,
    # Also include raw fields for debugging/fallback
    'raw_output': full_output,
    'foodType': food_type,  # Keep original key for compatibility
    'emails': emails,  # Array of email addresses
}
