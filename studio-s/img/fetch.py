import json,subprocess,time,urllib.parse,sys
UA="StudyQuizBot/1.0 (personal study; yellow8227@gmail.com)"
def get(url):
    for i in range(5):
        r=subprocess.run(["curl","-s","-A",UA,"-w","\n%{http_code}",url],capture_output=True)
        body,code=r.stdout.rsplit(b"\n",1)
        if code==b"200": return body
        time.sleep(4*(i+1))
    return b""
def api(host,params):
    q=urllib.parse.urlencode({**params,"format":"json","formatversion":"2"})
    return json.loads(get(f"https://{host}/w/api.php?{q}"))
EN=[("monalisa","Mona Lisa"),("lastsupper","The Last Supper (Leonardo)"),("starry","The Starry Night"),("sunflowers","Sunflowers (Van Gogh series)"),("scream","The Scream"),("pearl","Girl with a Pearl Earring"),("kiss","The Kiss (Klimt)"),("impression","Impression, Sunrise"),("venus","The Birth of Venus"),("wave","The Great Wave off Kanagawa"),("jatte","A Sunday Afternoon on the Island of La Grande Jatte"),("meninas","Las Meninas"),("liberty","Liberty Leading the People"),("nightwatch","The Night Watch"),("adam","The Creation of Adam"),("gleaners","The Gleaners"),("angelus","The Angelus (painting)"),("cards","The Card Players"),("gauguin","Where Do We Come From? What Are We? Where Are We Going?"),("dejeuner","Le Déjeuner sur l'herbe"),("olympia","Olympia (Manet)"),("galette","Bal du moulin de la Galette"),("waterlilies","Water Lilies (Monet series)"),("thinker","The Thinker"),("delights","The Garden of Earthly Delights"),("arnolfini","Arnolfini Portrait"),("primavera","Primavera (Botticelli)"),("wanderer","Wanderer above the Sea of Fog"),("rainsteam","Rain, Steam and Speed – The Great Western Railway"),("medusa","The Raft of the Medusa"),("marat","The Death of Marat"),("mondrian","Composition with Red, Blue and Yellow"),("gypsy","The Sleeping Gypsy"),("potato","The Potato Eaters"),("david","David (Michelangelo)"),("pieta","Pietà (Michelangelo)")]
KO=[("ssireum","Kim Hong-do Ssireum"),("seodang","Kim Hong-do Seodang school"),("miindo","Shin Yun-bok Portrait of a Beauty"),("wolha","Shin Yun-bok Wolhajeongin lovers under the moon"),("dano","Shin Yun-bok DanoPungjeong"),("inwang","Jeong Seon Inwangjesaekdo"),("geumgang","Jeong Seon Geumgang jeondo"),("sehando","Sehando Kim Jeong-hui"),("mongyu","Mongyu dowondo An Gyeon"),("yundoseo","Yun Du-seo self-portrait")]
import os
out=json.load(open("meta.json")) if os.path.exists("meta.json") else {}
def fetch_file(key,fname):
    ii=api("commons.wikimedia.org",{"action":"query","titles":"File:"+fname,"prop":"imageinfo","iiprop":"url|extmetadata","iiurlwidth":"500"})
    p=ii["query"]["pages"][0]
    if "imageinfo" not in p: return None
    info=p["imageinfo"][0]
    t=info.get("thumburl","").replace("thumb.wikimedia.org","upload.wikimedia.org").split("?")[0]
    if not t: return None
    data=get(t)
    if len(data)<3000 or not (data[:3]==b"\xff\xd8\xff" or data[:4]==b"\x89PNG"): return None
    ext="jpg" if data[:3]==b"\xff\xd8\xff" else "png"
    open(f"{key}.{ext}","wb").write(data)
    lic=info.get("extmetadata",{}).get("LicenseShortName",{}).get("value","")
    return {"file":f"{key}.{ext}","src":fname,"license":lic,"w":info.get("thumbwidth"),"h":info.get("thumbheight")}
for key,title in EN:
    if out.get(key): continue
    name=None
    try:
        d=api("en.wikipedia.org",{"action":"query","titles":title,"prop":"pageimages","piprop":"name","redirects":"1"})
        name=d["query"]["pages"][0].get("pageimage")
        r=fetch_file(key,name) if name else None
    except Exception as e: r=None
    out[key]=r; print(key,name if 'name' in dir() else '',r and r["license"],file=sys.stderr); time.sleep(3)
for key,q in KO:
    if out.get(key): continue
    hits=[]
    try:
        d=api("commons.wikimedia.org",{"action":"query","list":"search","srnamespace":"6","srsearch":q,"srlimit":"3"})
        hits=[h["title"][5:] for h in d["query"]["search"] if h["title"].lower().endswith((".jpg",".jpeg",".png"))]
        r=fetch_file(key,hits[0]) if hits else None
    except Exception as e: r=None
    out[key]=r; print(key,hits[:1] if 'hits' in dir() else '',r and r["license"],file=sys.stderr); time.sleep(3)
json.dump(out,open("meta.json","w"),ensure_ascii=False,indent=1)
