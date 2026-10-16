from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import pdfplumber
import json
import re
import os
import requests
from dotenv import load_dotenv

load_dotenv()
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

app = Flask(__name__)
# Allow the local frontend to connect to Flask
CORS(app, origins=[
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5503",
    "http://localhost:5503"
])

# Load JSON skills database
def load_skills_data():
    try:
        with open('skills.json', 'r') as f:
            data = json.load(f)
            all_skills = set()
            for role_skills in data.values():
                for s in role_skills:
                    all_skills.add(s.lower())
            return data, list(all_skills)
    except FileNotFoundError:
        return {}, []

ROLES_DB, SKILLS_LIST = load_skills_data()

def extract_text_from_pdf(file_obj):
    text = ""
    try:
        with pdfplumber.open(file_obj) as pdf:
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + " "
    except Exception as e:
        print("PDF parse error:", e)
    return text.lower()

def extract_skills_from_text(text):
    found = set()
    for skill in SKILLS_LIST:
        # Use simple word boundary regex match for each tech skill
        pattern = r'\b' + re.escape(skill) + r'\b'
        if re.search(pattern, text):
            found.add(skill.capitalize())
    return found

def get_required_skills_from_role(text):
    text_lower = text.lower()
    for role, skills in ROLES_DB.items():
        if role.lower() in text_lower:
            # Return the exact skills required for that exact role
            return set([s.capitalize() for s in skills])
    return set()

# ── REMOVED: index() and serve_static() routes ──
# Live Server now handles all HTML/CSS/JS files from the frontend/ folder.
# Flask only serves API routes below.

@app.route('/api/config.js', methods=['GET'])
def get_config_js():
    js_content = f"const API_CONFIG = {{\n    SUPABASE_URL: '{SUPABASE_URL}',\n    SUPABASE_ANON_KEY: '{SUPABASE_ANON_KEY}'\n}};"
    return Response(js_content, mimetype='application/javascript')

@app.route('/api/analyze', methods=['POST'])
def analyze():
    if 'resume' not in request.files:
        return jsonify({"success": False, "message": "No resume file attached."})
    
    file = request.files['resume']
    jd_text = request.form.get('job_description', '').lower()

    if file.filename == '' or not jd_text:
        return jsonify({"success": False, "message": "Missing file or Job Description."})

    if not file.filename.endswith('.pdf'):
        return jsonify({"success": False, "message": "Only PDF file format is supported."})

    try:
        # 1. Extract Text from Uploaded PDF
        resume_text = extract_text_from_pdf(file)
        
        # 2. NLP Keyword Extraction from Resume
        resume_skills = extract_skills_from_text(resume_text)
        
        # 3. Check if user typed a specific Job Role (e.g. "frontend developer")
        jd_skills = get_required_skills_from_role(jd_text)
        
        # 4. If no specific Job Role found, extract Individual Skills from JD text
        if not jd_skills:
            jd_skills = extract_skills_from_text(jd_text)
        
        # 5. Fallback if still empty
        if not jd_skills:
            jd_skills = {"Javascript", "Api", "React", "Cloud", "Html"}

        found_skills = list(resume_skills.intersection(jd_skills))
        missing_skills = list(jd_skills.difference(resume_skills))

        percentage = 0
        if len(jd_skills) > 0:
            percentage = int((len(found_skills) / len(jd_skills)) * 100)

        return jsonify({
            "success": True,
            "match_percentage": percentage,
            "found_skills": found_skills,
            "missing_skills": missing_skills
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

def search_youtube_videos(query, max_results=3):
    safe_search_url = f"https://www.youtube.com/results?search_query={query.replace(' ', '+')}+programming+tutorial"
    
    # Safe fallback if API Key is dummy string, empty, or hasn't loaded properly
    if not YOUTUBE_API_KEY or "your_youtube_api_key" in YOUTUBE_API_KEY:
        return [
            {"title": f"Search '{query}' Tutorials Here", "channel": "YouTube Database", "url": safe_search_url, "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop&q=80"}
        ]
    
    url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query} programming tutorial course&type=video&key={YOUTUBE_API_KEY}&maxResults={max_results}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            videos = []
            for item in data.get('items', []):
                vid = {
                    "title": item['snippet']['title'],
                    "channel": item['snippet']['channelTitle'],
                    "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                    "thumbnail": item['snippet']['thumbnails']['high']['url']
                }
                videos.append(vid)
            # Ensure safe fallback dynamically if returned empty from API quota limits.
            if not videos:
                 return [{"title": f"Search '{query}' Tutorials Here", "channel": "YouTube Database", "url": safe_search_url, "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop&q=80"}]
            return videos
        else:
             # Handle 403 API errors effectively fallback to the Search Results instead of breaking!
             return [{"title": f"Search '{query}' Tutorials Here", "channel": "YouTube Database", "url": safe_search_url, "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop&q=80"}]
    except Exception as e:
        print("YouTube API error:", e)
        return [{"title": f"Search '{query}' Tutorials Here", "channel": "YouTube Database", "url": safe_search_url, "thumbnail": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=640&h=360&fit=crop&q=80"}]

@app.route('/api/skill-gap', methods=['POST'])
def skill_gap():
    if 'resume' not in request.files:
        return jsonify({"success": False, "message": "No resume file attached."})
    
    file = request.files['resume']
    target_role = request.form.get('target_role', '').lower()

    if file.filename == '' or not target_role:
        return jsonify({"success": False, "message": "Missing file or target role."})

    if not file.filename.endswith('.pdf'):
        return jsonify({"success": False, "message": "Only PDF file format is supported."})

    try:
        resume_text = extract_text_from_pdf(file)
        resume_skills = extract_skills_from_text(resume_text)
        
        jd_skills = get_required_skills_from_role(target_role)
        if not jd_skills:
            # Fallback text parsing if actual Role wasn't strictly found
            jd_skills = extract_skills_from_text(target_role)
            if not jd_skills:
                jd_skills = {"Javascript", "React", "Db"}

        missing_skills = list(jd_skills.difference(resume_skills))
        
        # Youtube Integration API Call Loop - Uncapped skills mapping
        recommendations = []
        
        # Iterate through entirely every single missing skill found
        for skill in missing_skills:
            # Request exactly 1 top video tutorial for every missing skill dynamically
            vids = search_youtube_videos(skill, max_results=1)
            if vids:
                recommendations.append({"skill": skill.capitalize(), "video": vids[0]})

        return jsonify({
            "success": True,
            "missing_skills": missing_skills,
            "recommendations": recommendations
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})



def get_groq_role_predictions(resume_text):
    if not GROQ_API_KEY:
        return [{
            "role": "API Key Missing",
            "match_percentage": 0,
            "reasoning": "Please add GROQ_API_KEY to your .env file and restart the server.",
            "tags": []
        }]

    url = "https://api.groq.com/openai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }

    prompt = f"""
    Analyze this resume and suggest the 3 most suitable entry-level job roles.
    Return ONLY a valid JSON array. Each item must have:
    - role: job title
    - match_percentage: integer from 0 to 100
    - reasoning: short explanation based on the resume
    - tags: array of relevant skills

    Resume:
    {resume_text}

    Example format:
    [
      {{
        "role": "Python Developer",
        "match_percentage": 85,
        "reasoning": "The resume shows Python programming skills.",
        "tags": ["Python", "SQL"]
      }}
    ]
    """

    payload = {
        "model": "openai/gpt-oss-120b",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.2
    }

    try:
        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=60
        )

        print("Groq API status:", response.status_code, flush=True)

        if response.status_code != 200:
            print("Groq API error:", response.text, flush=True)
            return [{
                "role": "Groq API Error",
                "match_percentage": 0,
                "reasoning": "Check the VS Code terminal for the Groq API error.",
                "tags": []
            }]

        result = response.json()
        content = result["choices"][0]["message"]["content"]
        content = content.strip()

        if content.startswith("```"):
            content = content.replace("```json", "", 1)
            content = content.replace("```", "").strip()

        predictions = json.loads(content)
        return predictions

    except Exception as e:
        print("Groq prediction error:", str(e), flush=True)
        return [{
            "role": "Prediction Error",
            "match_percentage": 0,
            "reasoning": "Could not process the AI response. Check the VS Code terminal.",
            "tags": []
        }]


@app.route('/api/predict-roles', methods=['POST'])
def predict_roles():
    # print("PREDICT ROLES ROUTE HIT", flush=True)
    if 'resume' not in request.files:
        return jsonify({"success": False, "message": "No resume file attached."})
    
    file = request.files['resume']
    if file.filename == '' or not file.filename.endswith('.pdf'):
        return jsonify({"success": False, "message": "Valid PDF resume is required."})

    try:
        resume_text = extract_text_from_pdf(file)
        
        # Call Groq API for insights
        # print("PREDICT ROLES FUNCTION CALLED")
        predictions = get_groq_role_predictions(resume_text)

        return jsonify({
            "success": True,
            "roles": predictions
        })

    except Exception as e:
        return jsonify({"success": False, "message": str(e)})

if __name__ == '__main__':
    print("===========================================")
    print("🚀 NLP Engine Running on port 5000")
    print("===========================================")
    app.run(port=5000, debug=True)