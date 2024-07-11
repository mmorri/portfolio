import numpy as np

class RandomModel:
    """
    Predicts random boudning boxes and classes for every image
    """
    def __init__(self):
        """
        Initialize your model here
        """
        self.class_names = [
                                'culex',
                                'japonicus-koreicus',
                                'culiseta',
                                'albopictus',
                                'anopheles',
                                'aegypti'
                           ]
    
    def predict(self, image):
        """
        Implements the object detection and classification for every image 
        Inputs: 
            image: RGB Image read with np.array(Image.open( path ))

        Outputs:
            class_label: text name of the class label
            bbox: bouding box prediction for the image in the format
                  [bbx_xtl, bbx_ytl, bbx_xbr, bbx_ybr]
            (Same format as the training dataset)
        """

        class_label = np.random.choice(self.class_names)
        
        h, w = image.shape[:2]
        xtl = np.random.randint(w-30)
        ytl = np.random.randint(xtl+15, w)
        xbr = np.random.randint(h-30)
        ybr = np.random.randint(xbr+15, h)
        
        bbox = [xtl, ytl, xbr, ybr]

        return class_label, bbox