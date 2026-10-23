# Super-résolution ×4 (Real-ESRGAN, version anime) pour les portraits trop petits. Dépendances : torch (CPU), numpy, Pillow.
import torch, torch.nn as nn, torch.nn.functional as F, numpy as np
class RDB(nn.Module):
    def __init__(s, nf=64, gc=32):
        super().__init__()
        s.conv1=nn.Conv2d(nf,gc,3,1,1); s.conv2=nn.Conv2d(nf+gc,gc,3,1,1); s.conv3=nn.Conv2d(nf+2*gc,gc,3,1,1); s.conv4=nn.Conv2d(nf+3*gc,gc,3,1,1); s.conv5=nn.Conv2d(nf+4*gc,nf,3,1,1); s.lrelu=nn.LeakyReLU(.2,True)
    def forward(s,x):
        x1=s.lrelu(s.conv1(x)); x2=s.lrelu(s.conv2(torch.cat((x,x1),1))); x3=s.lrelu(s.conv3(torch.cat((x,x1,x2),1))); x4=s.lrelu(s.conv4(torch.cat((x,x1,x2,x3),1)))
        return s.conv5(torch.cat((x,x1,x2,x3,x4),1))*.2+x
class RRDB(nn.Module):
    def __init__(s,nf,gc=32):
        super().__init__(); s.rdb1=RDB(nf,gc); s.rdb2=RDB(nf,gc); s.rdb3=RDB(nf,gc)
    def forward(s,x): return s.rdb3(s.rdb2(s.rdb1(x)))*.2+x
class RRDBNet(nn.Module):
    def __init__(s,nb=6,nf=64,gc=32):
        super().__init__()
        s.conv_first=nn.Conv2d(3,nf,3,1,1); s.body=nn.Sequential(*[RRDB(nf,gc) for _ in range(nb)]); s.conv_body=nn.Conv2d(nf,nf,3,1,1)
        s.conv_up1=nn.Conv2d(nf,nf,3,1,1); s.conv_up2=nn.Conv2d(nf,nf,3,1,1); s.conv_hr=nn.Conv2d(nf,nf,3,1,1); s.conv_last=nn.Conv2d(nf,3,3,1,1); s.lrelu=nn.LeakyReLU(.2,True)
    def forward(s,x):
        f=s.conv_first(x); f=f+s.conv_body(s.body(f))
        f=s.lrelu(s.conv_up1(F.interpolate(f,scale_factor=2,mode="nearest"))); f=s.lrelu(s.conv_up2(F.interpolate(f,scale_factor=2,mode="nearest")))
        return s.conv_last(s.lrelu(s.conv_hr(f)))
_m=None
def model():
    global _m
    if _m is None:
        _m=RRDBNet(); sd=torch.load(weights(),map_location="cpu"); sd=sd.get("params_ema",sd.get("params",sd)); _m.load_state_dict(sd,strict=True); _m.eval()
    return _m
@torch.no_grad()
def up4(img):  # img: PIL RGB -> PIL RGB ×4
    from PIL import Image
    x=torch.from_numpy(np.asarray(img,np.float32)/255.).permute(2,0,1)[None]
    y=model()(x).clamp(0,1)[0].permute(1,2,0).numpy()
    return Image.fromarray((y*255+.5).astype(np.uint8))

# poids du modèle (Real-ESRGAN anime 6B, 18 Mo) : téléchargés une fois dans tools/illus/.cache (hors git)
def weights():
    import os, pathlib, urllib.request
    p = pathlib.Path(__file__).parent / ".cache" / "RealESRGAN_x4plus_anime_6B.pth"
    if not p.exists():
        p.parent.mkdir(exist_ok=True)
        urllib.request.urlretrieve("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth", p)
    return str(p)
