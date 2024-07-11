# Add your models here

Your models need to implement a class that contains the `predict` function. This will recieve a single input image and output the classification and bouding box coordinates.

Your model needs to predict the result for each image in `1 second`

# Regarding YOLOv5 code

Since AIcrowd submissions need to run without internet. The code for YOLOv5 is copied locally in `my_models/torch_hub_cache/yolov5/`, the commit hash used is `94e943e609f296fc2b0eddf32f3f9b28ad1da106`.

Full credit goes to `https://github.com/ultralytics/yolov5/`