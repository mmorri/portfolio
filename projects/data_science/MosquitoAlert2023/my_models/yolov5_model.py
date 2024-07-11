import numpy as np
import torch

def classify_image(model, image):
    image_information = {}
    result = model(image)
    result_df = result.pandas().xyxy[0]
    if result_df.empty:
        print('No results from yolov5 model!')
    else:
        image_information = result_df.to_dict()
    return image_information

# getting mosquito_class name from predicted result
def extract_predicted_mosquito_class_name(extractedInformation):
    mosquito_class = ""
    if extractedInformation is not None:
        mosquito_class = str(extractedInformation.get("name").get(0))
    return mosquito_class

# getting mosquito_class number from predicted result
def extract_predicted_mosquito_class_number(extractedInformation):
    mosquito_class = ""
    if extractedInformation is not None:
        mosquito_class = str(extractedInformation.get("class").get(0))
    return mosquito_class

# getting mosquito_class confidence score from predicted result
def extract_predicted_mosquito_class_confidence(extractedInformation):
    mosquito_class = ""
    if extractedInformation is not None:
        mosquito_class = str(extractedInformation.get("confidence").get(0))
    return mosquito_class

def extract_predicted_mosquito_bbox(extractedInformation):
    bbox = []
    if extractedInformation is not None:
        xmin = str(extractedInformation.get("xmin").get(0))
        ymin = str(extractedInformation.get("ymin").get(0))
        xmax = str(extractedInformation.get("xmax").get(0))
        ymax = str(extractedInformation.get("ymax").get(0))
        bbox = [xmin, ymin, xmax, ymax]
    return bbox

class YOLOModel:
    def __init__(self):
        trained_model_path = "my_models/yolo_model_weights/mosquitoalert-yolov5-baseline.pt"
        repo_path = "my_models/torch_hub_cache/yolov5"
        self.model = torch.hub.load(repo_path, 'custom', 
                                     path=trained_model_path, 
                                     force_reload=True,
                                     source='local')
    
    def predict(self, image):
        predictedInformation = classify_image(self.model, image)
        mosquito_class_name_predicted = ""
        mosquito_class_bbox = [0, 0, 0, 0]

        if predictedInformation:
            mosquito_class_name_predicted = extract_predicted_mosquito_class_name(predictedInformation)
            mosquito_class_bbox = extract_predicted_mosquito_bbox(predictedInformation)

        bbox = [int(float(mcb)) for mcb in mosquito_class_bbox]

        return mosquito_class_name_predicted, bbox