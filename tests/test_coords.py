import pytest
from aip.coords import CoordError, parse_lat, parse_lon


def test_lat_lon_basic():
    assert parse_lat("505428N") == pytest.approx(50.907778, abs=1e-6)
    assert parse_lon("0040820E") == pytest.approx(4.138889, abs=1e-6)


def test_hemispheres():
    assert parse_lat("505428S") < 0
    assert parse_lon("0040820W") < 0


def test_decimal_seconds_and_spaces():
    assert parse_lat(" 502755.51N ") == pytest.approx(50.465419, abs=1e-6)


@pytest.mark.parametrize("bad", ["", "50N", "9999999N", "506028N", "505460N", "914000N"])
def test_bad_lat(bad):
    with pytest.raises(CoordError):
        parse_lat(bad)


@pytest.mark.parametrize("bad", ["", "4E", "1815959E", "0046000E", "0040860E"])
def test_bad_lon(bad):
    with pytest.raises(CoordError):
        parse_lon(bad)
