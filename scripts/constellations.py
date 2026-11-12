"""
Constellation data for the portfolio night sky.

Each constellation lists its stars as (label, right ascension in hours, declination in degrees,
visual magnitude), J2000 positions, plus the stick figure lines between them.

Running this script prints the SKY array the site uses: for every constellation, a gnomonic
projection centred on the figure (east to the left, north up, units in degrees), recentred on
its bounding box, as {"n": name, "s": [[x, y, magnitude], ...], "e": [[i, j], ...]}.

Usage:  python3 constellations.py > sky.json
To add a figure, add an entry to C and run it again.
"""
import json
import math

C = {
 'ORION': ([('Betelgeuse',5.919,7.41,0.50),('Bellatrix',5.419,6.35,1.64),('Alnitak',5.679,-1.94,1.77),('Alnilam',5.604,-1.20,1.69),('Mintaka',5.533,-0.30,2.23),('Saiph',5.796,-9.67,2.09),('Rigel',5.242,-8.20,0.13),('Meissa',5.585,9.93,3.39)],
   [('Meissa','Betelgeuse'),('Meissa','Bellatrix'),('Betelgeuse','Alnitak'),('Bellatrix','Mintaka'),('Alnitak','Alnilam'),('Alnilam','Mintaka'),('Alnitak','Saiph'),('Mintaka','Rigel'),('Betelgeuse','Bellatrix'),('Saiph','Rigel')]),
 'URSA MAJOR': ([('Dubhe',11.062,61.75,1.79),('Merak',11.031,56.38,2.37),('Phecda',11.897,53.69,2.44),('Megrez',12.257,57.03,3.31),('Alioth',12.900,55.96,1.77),('Mizar',13.399,54.93,2.23),('Alkaid',13.792,49.31,1.86)],
   [('Dubhe','Merak'),('Merak','Phecda'),('Phecda','Megrez'),('Megrez','Dubhe'),('Megrez','Alioth'),('Alioth','Mizar'),('Mizar','Alkaid')]),
 'URSA MINOR': ([('Polaris',2.530,89.26,1.98),('Yildun',17.537,86.59,4.35),('eps',16.766,82.04,4.20),('zet',15.734,77.79,4.30),('Kochab',14.845,74.16,2.08),('Pherkad',15.345,71.83,3.00),('eta',16.292,75.76,4.95)],
   [('Polaris','Yildun'),('Yildun','eps'),('eps','zet'),('zet','Kochab'),('Kochab','Pherkad'),('Pherkad','eta'),('eta','zet')]),
 'CASSIOPEIA': ([('Caph',0.153,59.15,2.27),('Schedar',0.675,56.54,2.24),('gam',0.945,60.72,2.47),('Ruchbah',1.430,60.24,2.68),('Segin',1.907,63.67,3.37)],
   [('Caph','Schedar'),('Schedar','gam'),('gam','Ruchbah'),('Ruchbah','Segin')]),
 'CYGNUS': ([('Deneb',20.690,45.28,1.25),('Sadr',20.370,40.26,2.23),('Albireo',19.512,27.96,3.05),('Gienah',20.770,33.97,2.48),('del',19.750,45.13,2.87),('zet',21.216,30.23,3.20),('kap',19.285,53.37,3.80)],
   [('Deneb','Sadr'),('Sadr','Albireo'),('Sadr','Gienah'),('Gienah','zet'),('Sadr','del'),('del','kap')]),
 'LYRA': ([('Vega',18.616,38.78,0.03),('eps',18.739,39.67,4.70),('zet',18.746,37.60,4.30),('Sheliak',18.835,33.36,3.50),('Sulafat',18.982,32.69,3.25),('del',18.908,36.90,4.30)],
   [('Vega','eps'),('Vega','zet'),('eps','zet'),('zet','Sheliak'),('Sheliak','Sulafat'),('Sulafat','del'),('del','zet')]),
 'AQUILA': ([('Altair',19.846,8.87,0.77),('Tarazed',19.771,10.61,2.72),('Alshain',19.922,6.41,3.71),('zet',19.090,13.86,2.99),('del',19.425,3.11,3.36),('lam',19.104,-4.88,3.40),('eta',19.874,1.01,3.90),('the',20.188,-0.82,3.20)],
   [('Tarazed','Altair'),('Altair','Alshain'),('Altair','del'),('del','zet'),('del','lam'),('Alshain','eta'),('eta','the')]),
 'SCORPIUS': ([('Acrab',16.091,-19.81,2.62),('Dschubba',16.006,-22.62,2.29),('pi',15.981,-26.11,2.89),('sig',16.353,-25.59,2.89),('Antares',16.490,-26.43,1.06),('tau',16.598,-28.22,2.82),('eps',16.836,-34.29,2.29),('mu',16.864,-38.05,3.00),('zet',16.910,-42.36,3.60),('eta',17.203,-43.24,3.33),('Sargas',17.622,-43.00,1.86),('iot',17.793,-40.13,3.00),('kap',17.708,-39.03,2.39),('Shaula',17.560,-37.10,1.62),('Lesath',17.513,-37.30,2.70)],
   [('Acrab','Dschubba'),('Dschubba','pi'),('Dschubba','sig'),('sig','Antares'),('Antares','tau'),('tau','eps'),('eps','mu'),('mu','zet'),('zet','eta'),('eta','Sargas'),('Sargas','iot'),('iot','kap'),('kap','Shaula'),('Shaula','Lesath')]),
 'SAGITTARIUS': ([('Alnasl',18.097,-30.42,2.99),('KausMedia',18.350,-29.83,2.70),('KausAustralis',18.403,-34.38,1.85),('KausBorealis',18.466,-25.42,2.80),('phi',18.761,-26.99,3.17),('Nunki',18.921,-26.30,2.05),('tau',19.116,-27.67,3.30),('Ascella',19.044,-29.88,2.60)],
   [('Alnasl','KausMedia'),('Alnasl','KausAustralis'),('KausMedia','KausAustralis'),('KausMedia','phi'),('phi','Ascella'),('Ascella','KausAustralis'),('KausMedia','KausBorealis'),('KausBorealis','phi'),('phi','Nunki'),('Nunki','tau'),('tau','Ascella')]),
 'LEO': ([('Regulus',10.140,11.97,1.35),('eta',10.122,16.76,3.50),('Algieba',10.333,19.84,2.08),('Adhafera',10.278,23.42,3.40),('mu',9.879,26.01,3.90),('eps',9.764,23.77,2.98),('Zosma',11.235,20.52,2.56),('Chertan',11.237,15.43,3.33),('Denebola',11.818,14.57,2.14)],
   [('Regulus','eta'),('eta','Algieba'),('Algieba','Adhafera'),('Adhafera','mu'),('mu','eps'),('Algieba','Zosma'),('Zosma','Denebola'),('Denebola','Chertan'),('Chertan','Regulus'),('Zosma','Chertan')]),
 'GEMINI': ([('Castor',7.577,31.89,1.58),('Pollux',7.755,28.03,1.14),('tau',7.186,30.25,4.40),('Mebsuta',6.732,25.13,2.98),('Tejat',6.383,22.51,2.87),('Propus',6.248,22.51,3.30),('Wasat',7.335,21.98,3.53),('Mekbuda',7.068,20.57,3.90),('Alhena',6.629,16.40,1.93)],
   [('Castor','Pollux'),('Castor','tau'),('tau','Mebsuta'),('Mebsuta','Tejat'),('Tejat','Propus'),('Pollux','Wasat'),('Wasat','Mekbuda'),('Mekbuda','Alhena')]),
 'TAURUS': ([('Aldebaran',4.599,16.51,0.85),('gam',4.330,15.63,3.65),('del',4.382,17.54,3.76),('eps',4.477,19.18,3.53),('Elnath',5.438,28.61,1.65),('zet',5.627,21.14,3.00),('lam',4.011,12.49,3.40),
              ('Alcyone',3.791,24.11,2.87),('Atlas',3.819,24.05,3.62),('Electra',3.748,24.11,3.70),('Maia',3.763,24.37,3.87),('Merope',3.772,23.95,4.18),('Taygeta',3.754,24.47,4.30)],
   [('lam','gam'),('gam','del'),('del','eps'),('eps','Elnath'),('gam','Aldebaran'),('Aldebaran','zet')]),
 'CANIS MAJOR': ([('Sirius',6.752,-16.72,-1.46),('Mirzam',6.378,-17.96,1.98),('omi2',7.050,-23.83,3.02),('Wezen',7.140,-26.39,1.83),('Aludra',7.402,-29.30,2.45),('Adhara',6.977,-28.97,1.50),('Furud',6.338,-30.06,3.02)],
   [('Mirzam','Sirius'),('Sirius','omi2'),('omi2','Wezen'),('Wezen','Aludra'),('Wezen','Adhara'),('Adhara','Furud')]),
 'CRUX': ([('Acrux',12.443,-63.10,0.77),('Gacrux',12.519,-57.11,1.63),('Mimosa',12.795,-59.69,1.25),('Imai',12.252,-58.75,2.80),('Ginan',12.356,-60.40,3.59)],
   [('Acrux','Gacrux'),('Mimosa','Imai')]),
 'PEGASUS': ([('Markab',23.079,15.21,2.48),('Scheat',23.063,28.08,2.42),('Algenib',0.220,15.18,2.83),('Alpheratz',0.140,29.09,2.06),('Homam',22.691,10.83,3.40),('Biham',22.170,6.20,3.50),('Enif',21.736,9.88,2.39)],
   [('Markab','Scheat'),('Scheat','Alpheratz'),('Alpheratz','Algenib'),('Algenib','Markab'),('Markab','Homam'),('Homam','Biham'),('Biham','Enif')]),
}

C.update({
 'ARIES': ([('Hamal',2.120,23.46,2.00),('Sheratan',1.911,20.81,2.64),('Mesarthim',1.892,19.29,3.90),('41Ari',2.833,27.26,3.60)],
   [('41Ari','Hamal'),('Hamal','Sheratan'),('Sheratan','Mesarthim')]),
 'CANCER': ([('Acubens',8.975,11.86,4.25),('AsAus',8.745,18.15,3.94),('AsBor',8.721,21.47,4.66),('iot',8.778,28.76,4.00),('Tarf',8.275,9.19,3.52)],
   [('AsAus','Acubens'),('AsAus','AsBor'),('AsBor','iot'),('AsAus','Tarf')]),
 'VIRGO': ([('Spica',13.420,-11.16,0.97),('Porrima',12.694,-1.45,2.74),('Vindemiatrix',13.036,10.96,2.85),('Minelauva',12.927,3.40,3.38),('Zavijava',11.845,1.76,3.60),('Zaniah',12.332,-0.67,3.90),('Heze',13.578,-0.60,3.37),('tau',14.027,1.54,4.30),('109Vir',14.770,1.89,3.70),('iot',14.267,-6.00,4.10),('mu',14.718,-5.66,3.90)],
   [('Zavijava','Zaniah'),('Zaniah','Porrima'),('Porrima','Minelauva'),('Minelauva','Vindemiatrix'),('Porrima','Spica'),('Minelauva','Heze'),('Heze','Spica'),('Heze','tau'),('tau','109Vir'),('Spica','iot'),('iot','mu')]),
 'LIBRA': ([('Zubenelgenubi',14.848,-16.04,2.75),('Zubeneschamali',15.283,-9.38,2.61),('sig',15.068,-25.28,3.29),('gam',15.592,-14.79,3.90),('ups',15.617,-28.14,3.60),('tau',15.644,-29.78,3.70)],
   [('Zubenelgenubi','Zubeneschamali'),('Zubeneschamali','gam'),('gam','Zubenelgenubi'),('Zubenelgenubi','sig'),('gam','ups'),('ups','tau')]),
 'CAPRICORNUS': ([('Algedi',20.300,-12.54,3.57),('Dabih',20.350,-14.78,3.08),('psi',20.768,-25.27,4.10),('ome',20.864,-26.92,4.10),('zet',21.444,-22.41,3.70),('DenebAlgedi',21.784,-16.13,2.87),('Nashira',21.668,-16.66,3.68),('iot',21.371,-16.83,4.30),('the',21.099,-17.23,4.10)],
   [('Algedi','Dabih'),('Dabih','psi'),('psi','ome'),('ome','zet'),('zet','DenebAlgedi'),('DenebAlgedi','Nashira'),('Nashira','iot'),('iot','the'),('the','Dabih')]),
 'AQUARIUS': ([('Albali',20.795,-9.50,3.77),('Sadalsuud',21.526,-5.57,2.90),('Sadalmelik',22.096,-0.32,2.95),('Sadachbia',22.361,-1.39,3.85),('zet',22.480,-0.02,3.65),('eta',22.589,-0.12,4.00),('pi',22.421,1.38,4.60),('the',22.281,-7.78,4.20),('lam',22.877,-7.58,3.70),('Skat',22.911,-15.82,3.27)],
   [('Albali','Sadalsuud'),('Sadalsuud','Sadalmelik'),('Sadalmelik','Sadachbia'),('Sadachbia','zet'),('zet','eta'),('zet','pi'),('Sadalmelik','the'),('the','lam'),('lam','Skat')]),
 'ANDROMEDA': ([('Alpheratz',0.140,29.09,2.06),('del',0.655,30.86,3.27),('Mirach',1.162,35.62,2.05),('Almach',2.065,42.33,2.10),('mu',0.946,38.50,3.87),('nu',0.830,41.08,4.50)],
   [('Alpheratz','del'),('del','Mirach'),('Mirach','Almach'),('Mirach','mu'),('mu','nu')]),
 'PERSEUS': ([('Mirfak',3.405,49.86,1.79),('Algol',3.136,40.96,2.12),('gam',3.080,53.51,2.90),('del',3.715,47.79,3.00),('eps',3.964,40.01,2.90),('zet',3.902,31.88,2.85),('eta',2.845,55.90,3.80),('rho',3.086,38.84,3.40),('kap',3.158,44.86,3.80)],
   [('eta','gam'),('gam','Mirfak'),('Mirfak','del'),('del','eps'),('eps','zet'),('Mirfak','kap'),('kap','Algol'),('Algol','rho')]),
 'BOOTES': ([('Arcturus',14.261,19.18,-0.05),('Izar',14.750,27.07,2.37),('del',15.258,33.31,3.47),('Nekkar',15.032,40.39,3.50),('Seginus',14.535,38.31,3.03),('rho',14.530,30.37,3.58),('Muphrid',13.911,18.40,2.68),('zet',14.686,13.73,3.78)],
   [('Arcturus','Izar'),('Izar','del'),('del','Nekkar'),('Nekkar','Seginus'),('Seginus','rho'),('rho','Arcturus'),('Arcturus','Muphrid'),('Arcturus','zet')]),
 'CORONA BOREALIS': ([('the',15.549,31.36,4.14),('bet',15.464,29.11,3.66),('Alphecca',15.578,26.71,2.23),('gam',15.712,26.30,3.81),('del',15.827,26.07,4.60),('eps',15.960,26.88,4.15),('iot',16.024,29.85,4.98)],
   [('the','bet'),('bet','Alphecca'),('Alphecca','gam'),('gam','del'),('del','eps'),('eps','iot')]),
 'CEPHEUS': ([('Alderamin',21.310,62.59,2.45),('Alfirk',21.478,70.56,3.20),('Errai',23.656,77.63,3.20),('iot',22.828,66.20,3.50),('zet',22.181,58.20,3.35)],
   [('Alderamin','Alfirk'),('Alfirk','Errai'),('Errai','iot'),('iot','Alfirk'),('iot','zet'),('zet','Alderamin')]),
 'AURIGA': ([('Capella',5.278,46.00,0.08),('Menkalinan',5.992,44.95,1.90),('the',5.995,37.21,2.60),('Elnath',5.438,28.61,1.65),('Hassaleh',4.950,33.17,2.70),('Almaaz',5.033,43.82,3.00),('Haedus',5.109,41.23,3.20)],
   [('Capella','Menkalinan'),('Menkalinan','the'),('the','Elnath'),('Elnath','Hassaleh'),('Hassaleh','Capella'),('Capella','Almaaz'),('Almaaz','Haedus'),('Haedus','Capella')]),
 'HERCULES': ([('eps',17.005,30.93,3.90),('zet',16.688,31.60,2.81),('eta',16.715,38.92,3.50),('pi',17.251,36.81,3.16),('Kornephoros',16.504,21.49,2.77),('del',17.251,24.84,3.12),('Rasalgethi',17.244,14.39,3.48),('the',17.938,37.25,3.86),('iot',17.658,46.01,3.80),('sig',16.568,42.44,4.20),('tau',16.330,46.31,3.90)],
   [('eps','zet'),('zet','eta'),('eta','pi'),('pi','eps'),('zet','Kornephoros'),('eps','del'),('del','Rasalgethi'),('pi','the'),('the','iot'),('eta','sig'),('sig','tau')]),
 'CANIS MINOR': ([('Procyon',7.655,5.22,0.34),('Gomeisa',7.452,8.29,2.90)], [('Procyon','Gomeisa')]),
 'DELPHINUS': ([('Sualocin',20.661,15.91,3.77),('Rotanev',20.626,14.60,3.60),('gam',20.777,16.12,4.27),('del',20.724,15.07,4.43),('eps',20.554,11.30,4.03)],
   [('Sualocin','Rotanev'),('Rotanev','del'),('del','gam'),('gam','Sualocin'),('Rotanev','eps')]),
 'CORVUS': ([('Gienah',12.263,-17.54,2.59),('Kraz',12.573,-23.40,2.65),('Algorab',12.498,-16.52,2.95),('Minkar',12.169,-22.62,3.00),('Alchiba',12.140,-24.73,4.00)],
   [('Gienah','Algorab'),('Algorab','Kraz'),('Kraz','Minkar'),('Minkar','Gienah'),('Minkar','Alchiba')]),
 'TRIANGULUM': ([('Mothallah',1.885,29.58,3.41),('bet',2.159,34.99,3.00),('gam',2.289,33.85,4.00)],
   [('Mothallah','bet'),('bet','gam'),('gam','Mothallah')]),
})


def project(stars):
    """Gnomonic projection of (ra_h, dec_deg) pairs, centred on their mean direction."""
    vecs = []
    for _, ra, dec, _ in stars:
        a, d = math.radians(ra * 15), math.radians(dec)
        vecs.append((math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)))
    cx, cy, cz = (sum(v[i] for v in vecs) for i in range(3))
    n = math.sqrt(cx * cx + cy * cy + cz * cz)
    cx, cy, cz = cx / n, cy / n, cz / n
    d0, a0 = math.asin(cz), math.atan2(cy, cx)
    pts = []
    for _, ra, dec, mag in stars:
        a, d = math.radians(ra * 15), math.radians(dec)
        cosc = math.sin(d0) * math.sin(d) + math.cos(d0) * math.cos(d) * math.cos(a - a0)
        xi = math.cos(d) * math.sin(a - a0) / cosc
        eta = (math.cos(d0) * math.sin(d) - math.sin(d0) * math.cos(d) * math.cos(a - a0)) / cosc
        pts.append([-math.degrees(xi), -math.degrees(eta), mag])  # east left, north up (screen y down)
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    mx, my = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    return [[round(p[0] - mx, 2), round(p[1] - my, 2), p[2]] for p in pts]


def build():
    out = []
    for name, (stars, edges) in C.items():
        idx = {s[0]: i for i, s in enumerate(stars)}
        out.append({"n": name, "s": project(stars), "e": [[idx[a], idx[b]] for a, b in edges]})
    return out


if __name__ == "__main__":
    print(json.dumps(build(), separators=(",", ":")))
