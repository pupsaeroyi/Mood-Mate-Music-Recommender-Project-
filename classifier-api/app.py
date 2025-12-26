from flask import Flask, request, jsonify
from transformers import pipeline
from rapidfuzz import process
import re

app = Flask(__name__)

#Load the zero-shot classification model
classifier = pipeline("zero-shot-classification", model="MoritzLaurer/deberta-v3-large-zeroshot-v1")


label_descriptions = {
    "happy": "feeling joyful, upbeat, cheerful, and full of positive energy",
    "sad": "feeling gloomy, teary, emotionally down, or hurt",
    "chill": "feeling relaxed, calm, easygoing, and emotionally steady",
    "lofi": "mentally tired, burned out, needing chill background music to study, focus, concentrate, or work peacefully without distractions",
    "angry": "feeling frustrated, tense, irritable, or full of rage",
    "romantic": "feeling in love, affectionate, or emotionally close to someone",
    "heartbroken": "feeling rejected, emotionally crushed, or going through breakup or romantic loss",
    "motivated": "feeling inspired, goal-driven, energetic, and ready to succeed",
    "confident": "feeling bold, empowered, fearless, and proud of yourself",
    "lonely": "feeling alone, isolated, emotionally distant, or craving connection",
    "lost": "feeling directionless, mentally stuck, or unsure about life",
    "cozy": "feeling safe, warm, emotionally secure, and at peace",
    "party": "feeling hyped, excited, energetic, and ready to dance or celebrate",
    "high": "feeling euphoric, floaty, buzzed, stoned, spacey, mellow, detached from reality, or like you're mentally drifting in a dream-like state",
    "bored": "feeling uninterested, restless, mentally idle, or seeking stimulation"
}

emoji_map = {
    "😊": "happy",
    "😢": "sad",
    "😡": "angry",
    "😴": "tired",
    "❤️": "love",
    "💔": "heartbreak",
    "😎": "confident",
    "🤪": "wild",
    "🔥": "motivated",
    "🎉": "party",
    "🧘": "spiritual",
    "😔": "lonely"
}

synonym_map = {
    "study": "lofi",
    "focusing": "lofi",
    "concentrating": "lofi",
    "homework": "lofi",
    "need to focus": "lofi",
    "i miss her": "heartbroken",
    "rejected": "heartbroken",
    "bold": "confident", 
    "feeling bold": "confident",
    "tired": "lofi",
    "exhausted": "lofi",
    "burnt out": "lofi",
    "safe": "cozy",
    "sda": "sad",
    "happt": "happy",
    "haopt": "happy",
    "lonle": "lonely",
    "trd": "tired"
}
def preprocess_mood(raw_mood):
    # Normalize mood string
    cleaned = raw_mood.strip().lower()

    # Direct emoji handling
    for emoji, replacement in emoji_map.items():
        if emoji in cleaned:
            return replacement

    for keyword, mapped in synonym_map.items():
        if keyword in cleaned:
            return mapped

    known_keywords = list(label_descriptions.keys())
    match, score = process.extractOne(cleaned, known_keywords)[:2]
    if score >= 50:
        return match

    return cleaned




@app.route("/classify", methods=["POST"])
def classify():
    data = request.get_json()
    raw_mood = data.get("mood", "").lower()
    mood = preprocess_mood(raw_mood)

    if not mood:
        return jsonify({"error": "No mood provided"}), 400

    labels = list(label_descriptions.values())
    result = classifier(mood, labels)
    best_label = result["labels"][0]

    # Map back from description to category
    for key, desc in label_descriptions.items():
        if desc == best_label:
            return jsonify({"category": key})

    return jsonify({"category": "chill"})  # Fallback

if __name__ == "__main__":
    app.run(port=5000)
