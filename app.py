import os
from flask import Flask, request, render_template, jsonify
from werkzeug.utils import secure_filename
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)

# --- Initialization ---
app = Flask(__name__)

# --- Load the trained model ---
# Make sure the model file is in the same directory as this script
MODEL_PATH = 'brain_tumor_model.h5'
try:
    model = load_model(MODEL_PATH)
    logging.info(f"Model loaded successfully from {MODEL_PATH}")
except Exception as e:
    logging.error(f"Error loading model: {e}")
    model = None

# Define the class names in the correct order
CLASS_NAMES = ['glioma', 'meningioma', 'notumor', 'pituitary']

# --- Prediction Function ---
def model_predict(img_path, loaded_model):
    logging.info(f"Predicting for image: {img_path}")
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_batch = np.expand_dims(img_array, axis=0)
    img_preprocessed = img_batch / 255.
    
    prediction = loaded_model.predict(img_preprocessed)
    logging.info(f"Raw prediction: {prediction}")
    
    predicted_index = np.argmax(prediction)
    predicted_class = CLASS_NAMES[predicted_index]
    
    return predicted_class

# --- Routes ---
@app.route('/', methods=['GET'])
def index():
    # Render the main page
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if model is None:
        return jsonify({'error': 'Model is not loaded, check server logs.'}), 500

    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400
    
    if file:
        try:
            # Save the file to a temporary uploads folder
            basepath = os.path.dirname(__file__)
            upload_folder = os.path.join(basepath, 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            file_path = os.path.join(upload_folder, secure_filename(file.filename))
            file.save(file_path)

            # Make prediction
            prediction_result = model_predict(file_path, model)
            
            # Clean up the uploaded file
            os.remove(file_path)

            logging.info(f"Prediction successful: {prediction_result}")
            # Return the result as JSON
            return jsonify({'prediction': prediction_result})

        except Exception as e:
            logging.error(f"Prediction error: {e}")
            return jsonify({'error': str(e)}), 500

    return jsonify({'error': 'An unknown error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=True) # Set debug=False for production